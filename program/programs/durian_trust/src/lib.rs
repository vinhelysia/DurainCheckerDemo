use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    hash::hashv,
    sysvar::instructions::{load_current_index_checked, load_instruction_at_checked},
};

declare_id!("11111111111111111111111111111111");

const MAX_ID_LEN: usize = 32;
const MAX_FARM_LEN: usize = 96;
const MAX_PROVINCE_LEN: usize = 64;
const MAX_DATE_LEN: usize = 32;
const MAX_STAGE_LEN: usize = 96;
const MAX_LOCATION_LEN: usize = 128;
const MAX_AI_RESULT_LEN: usize = 256;
const MAX_RISK_CAUSE_LEN: usize = 256;

#[program]
pub mod durian_trust {
    use super::*;

    // ── initialization ────────────────────────────────────────────

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.next_token_id = 0;
        config.pending_authority = None;
        config.paused = false;
        Ok(())
    }

    // ── authority transfer (2-step) ───────────────────────────────

    /// Step 1: current authority nominates a successor.
    /// The nominee must call `accept_authority_transfer` to complete the handoff.
    pub fn propose_authority_transfer(
        ctx: Context<ProposeAuthorityTransfer>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            DurianTrustError::Unauthorized
        );
        config.pending_authority = Some(new_authority);
        emit!(AuthorityTransferProposed {
            proposed: new_authority,
            by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    /// Step 2: the pending authority accepts. Clears `pending_authority` on success.
    pub fn accept_authority_transfer(ctx: Context<AcceptAuthorityTransfer>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let pending = config
            .pending_authority
            .ok_or(DurianTrustError::NoPendingTransfer)?;
        require!(
            ctx.accounts.new_authority.key() == pending,
            DurianTrustError::Unauthorized
        );
        let old = config.authority;
        config.authority = pending;
        config.pending_authority = None;
        emit!(AuthorityTransferAccepted {
            old_authority: old,
            new_authority: pending,
        });
        Ok(())
    }

    // ── circuit breaker ───────────────────────────────────────────

    pub fn pause(ctx: Context<SetPaused>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            DurianTrustError::Unauthorized
        );
        ctx.accounts.config.paused = true;
        emit!(ProgramPaused {
            by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn unpause(ctx: Context<SetPaused>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            DurianTrustError::Unauthorized
        );
        ctx.accounts.config.paused = false;
        emit!(ProgramUnpaused {
            by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    // ── role management ───────────────────────────────────────────

    pub fn add_farmer(ctx: Context<AddFarmer>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleGranted {
            user,
            role: RoleType::Farmer,
            granted_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn remove_farmer(ctx: Context<RemoveFarmer>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleRevoked {
            user,
            role: RoleType::Farmer,
            revoked_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn add_lab(ctx: Context<AddLab>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleGranted {
            user,
            role: RoleType::Lab,
            granted_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn remove_lab(ctx: Context<RemoveLab>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleRevoked {
            user,
            role: RoleType::Lab,
            revoked_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn add_logistics(ctx: Context<AddLogistics>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleGranted {
            user,
            role: RoleType::Logistics,
            granted_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn remove_logistics(ctx: Context<RemoveLogistics>, user: Pubkey) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)?;
        emit!(RoleRevoked {
            user,
            role: RoleType::Logistics,
            revoked_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    // ── batch operations ──────────────────────────────────────────

    pub fn register_batch(
        ctx: Context<RegisterBatch>,
        id: String,
        farm: String,
        province: String,
        harvest_date: String,
        cadmium_ppm: u64,
        threshold_ppm: u64,
        confidence: u64,
        risk_level: RiskLevel,
        ai_result: String,
        risk_cause: String,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_role_or_authority(
            &ctx.accounts.config,
            &ctx.accounts.signer,
            ctx.accounts.farmer_role.is_some(),
        )?;

        validate_batch_strings(&id, &farm, &province, &harvest_date)?;
        validate_lab_report_strings(&ai_result, &risk_cause)?;

        let now = Clock::get()?.unix_timestamp;
        let token_id = ctx.accounts.config.next_token_id;
        let registrant = ctx.accounts.signer.key();
        let batch_key = ctx.accounts.batch.key();
        let event_id = id.clone();

        ctx.accounts.batch.set_inner(Batch {
            id,
            farm,
            province,
            harvest_date,
            registrant,
            token_id,
            timeline_count: 0,
            // lab_count starts at 1: index 0 is occupied by the registration-time
            // lab report initialised below. Subsequent update_lab_report calls use
            // indices 1, 2, … and increment this counter after each write.
            lab_count: 0_u32
                .checked_add(1)
                .ok_or(DurianTrustError::CounterOverflow)?,
            created_at: now,
        });

        ctx.accounts.lab_report.set_inner(LabReport {
            cadmium_ppm,
            threshold_ppm,
            confidence,
            risk_level,
            ai_result,
            risk_cause,
            reporter: registrant,
            timestamp: now,
        });

        ctx.accounts.config.next_token_id = ctx
            .accounts
            .config
            .next_token_id
            .checked_add(1)
            .ok_or(DurianTrustError::CounterOverflow)?;

        emit!(BatchRegistered {
            id: event_id,
            batch: batch_key,
            registrant,
            token_id,
        });

        Ok(())
    }

    pub fn add_timeline_event(
        ctx: Context<AddTimelineEvent>,
        id: String,
        stage: String,
        location: String,
        date: String,
        status: TimelineStatus,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_role_or_authority(
            &ctx.accounts.config,
            &ctx.accounts.signer,
            ctx.accounts.logistics_role.is_some(),
        )?;

        validate_id(&id)?;
        validate_timeline_strings(&stage, &location, &date)?;

        let index = ctx.accounts.batch.timeline_count;
        let batch_key = ctx.accounts.batch.key();

        ctx.accounts.timeline_event.set_inner(TimelineEvent {
            stage,
            location,
            date,
            status,
        });

        ctx.accounts.batch.timeline_count = ctx
            .accounts
            .batch
            .timeline_count
            .checked_add(1)
            .ok_or(DurianTrustError::CounterOverflow)?;

        emit!(TimelineEventAdded {
            id,
            batch: batch_key,
            index,
        });

        Ok(())
    }

    pub fn update_lab_report(
        ctx: Context<UpdateLabReport>,
        id: String,
        cadmium_ppm: u64,
        threshold_ppm: u64,
        confidence: u64,
        risk_level: RiskLevel,
        ai_result: String,
        risk_cause: String,
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_role_or_authority(
            &ctx.accounts.config,
            &ctx.accounts.signer,
            ctx.accounts.lab_role.is_some(),
        )?;

        validate_id(&id)?;
        validate_lab_report_strings(&ai_result, &risk_cause)?;

        let index = ctx.accounts.batch.lab_count;
        let batch_key = ctx.accounts.batch.key();
        let reporter = ctx.accounts.signer.key();

        ctx.accounts.lab_report.set_inner(LabReport {
            cadmium_ppm,
            threshold_ppm,
            confidence,
            risk_level,
            ai_result,
            risk_cause,
            reporter,
            timestamp: Clock::get()?.unix_timestamp,
        });

        ctx.accounts.batch.lab_count = ctx
            .accounts
            .batch
            .lab_count
            .checked_add(1)
            .ok_or(DurianTrustError::CounterOverflow)?;

        emit!(LabReportUpdated {
            id,
            batch: batch_key,
            index,
            reporter,
        });

        Ok(())
    }

    // ── lab attestation ───────────────────────────────────────────
    //
    // The lab API must submit a 2-instruction atomic transaction:
    //
    //   Ix 0 — native Ed25519SigVerify program
    //           verifies:  sig  over  payload_hash  using  lab_pubkey
    //
    //   Ix 1 — attest_lab_report (this instruction)
    //           • recomputes payload_hash from the stored LabReport
    //           • reads ix_sysvar, asserts ix 0 used the Ed25519 program
    //           • checks pubkey == signer, message == payload_hash, sig == sig
    //           • stores LabAttestation PDA
    //
    // Canonical payload bytes (SHA-256 input, in order):
    //   batch_id (UTF-8) || cadmium_ppm (8 LE) || threshold_ppm (8 LE)
    //   || confidence (8 LE) || risk_level (1 byte Borsh discriminant)
    //   || ai_result (UTF-8) || risk_cause (UTF-8) || reporter_pubkey (32 bytes)

    /// Attest an existing LabReport using an Ed25519 signature verified in ix 0.
    /// The caller must be the lab role holder (or authority) and must be the Ed25519
    /// signing key used in ix 0.
    pub fn attest_lab_report(
        ctx: Context<AttestLabReport>,
        id: String,
        lab_report_index: u32,
        sig: [u8; 64],
        payload_hash: [u8; 32],
    ) -> Result<()> {
        require_not_paused(&ctx.accounts.config)?;
        require_role_or_authority(
            &ctx.accounts.config,
            &ctx.accounts.signer,
            ctx.accounts.lab_role.is_some(),
        )?;

        // Recompute the expected hash from the stored LabReport and verify it matches
        // what the caller claims to have signed. This binds the signature to the actual
        // on-chain data, not just whatever bytes the caller passed in.
        let report = &ctx.accounts.lab_report;
        let expected_hash = compute_payload_hash(
            &id,
            report.cadmium_ppm,
            report.threshold_ppm,
            report.confidence,
            report.risk_level.as_u8(),
            &report.ai_result,
            &report.risk_cause,
            &report.reporter.to_bytes(),
        );
        require!(
            expected_hash == payload_hash,
            DurianTrustError::PayloadHashMismatch
        );

        // Verify the Ed25519 pre-instruction (ix 0) matches this signer + payload_hash + sig.
        verify_ed25519_ix(
            &ctx.accounts.ix_sysvar.to_account_info(),
            &ctx.accounts.signer.key().to_bytes(),
            &payload_hash,
            &sig,
        )?;

        let lab_pubkey = ctx.accounts.signer.key();
        let timestamp = Clock::get()?.unix_timestamp;

        ctx.accounts.attestation.set_inner(LabAttestation {
            lab_report_index,
            payload_hash,
            sig,
            lab_pubkey,
            timestamp,
        });

        emit!(LabReportAttested {
            id,
            lab_report_index,
            lab_pubkey,
            payload_hash,
        });

        Ok(())
    }

    /// Read-only tamper-evidence check: recomputes the payload hash from the live
    /// LabReport and asserts it still matches the stored LabAttestation. Emits
    /// `AttestationVerified` on success. Anyone may call this.
    pub fn verify_attestation(
        ctx: Context<VerifyAttestation>,
        id: String,
        lab_report_index: u32,
    ) -> Result<()> {
        let report = &ctx.accounts.lab_report;
        let attestation = &ctx.accounts.attestation;

        let computed_hash = compute_payload_hash(
            &id,
            report.cadmium_ppm,
            report.threshold_ppm,
            report.confidence,
            report.risk_level.as_u8(),
            &report.ai_result,
            &report.risk_cause,
            &report.reporter.to_bytes(),
        );

        require!(
            computed_hash == attestation.payload_hash,
            DurianTrustError::PayloadHashMismatch
        );

        emit!(AttestationVerified {
            id,
            lab_report_index,
            lab_pubkey: attestation.lab_pubkey,
            payload_hash: attestation.payload_hash,
        });

        Ok(())
    }
}

// ── context structs ───────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProposeAuthorityTransfer<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAuthorityTransfer<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub new_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct AddFarmer<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + FarmerRole::INIT_SPACE,
        seeds = [b"farmer", user.as_ref()],
        bump
    )]
    pub farmer_role: Account<'info, FarmerRole>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct RemoveFarmer<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [b"farmer", user.as_ref()],
        bump
    )]
    pub farmer_role: Account<'info, FarmerRole>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct AddLab<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + LabRole::INIT_SPACE,
        seeds = [b"lab_role", user.as_ref()],
        bump
    )]
    pub lab_role: Account<'info, LabRole>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct RemoveLab<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [b"lab_role", user.as_ref()],
        bump
    )]
    pub lab_role: Account<'info, LabRole>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct AddLogistics<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + LogisticsRole::INIT_SPACE,
        seeds = [b"logistics", user.as_ref()],
        bump
    )]
    pub logistics_role: Account<'info, LogisticsRole>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct RemoveLogistics<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [b"logistics", user.as_ref()],
        bump
    )]
    pub logistics_role: Account<'info, LogisticsRole>,
}

#[derive(Accounts)]
#[instruction(id: String)]
pub struct RegisterBatch<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = signer,
        space = 8 + Batch::INIT_SPACE,
        seeds = [b"batch", id.as_bytes()],
        bump
    )]
    pub batch: Account<'info, Batch>,
    #[account(
        init,
        payer = signer,
        space = 8 + LabReport::INIT_SPACE,
        seeds = [b"lab", id.as_bytes(), &0_u32.to_le_bytes()],
        bump
    )]
    pub lab_report: Account<'info, LabReport>,
    #[account(seeds = [b"farmer", signer.key().as_ref()], bump)]
    pub farmer_role: Option<Account<'info, FarmerRole>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String)]
pub struct AddTimelineEvent<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"batch", id.as_bytes()], bump)]
    pub batch: Account<'info, Batch>,
    #[account(
        init,
        payer = signer,
        space = 8 + TimelineEvent::INIT_SPACE,
        seeds = [b"timeline", id.as_bytes(), &batch.timeline_count.to_le_bytes()],
        bump
    )]
    pub timeline_event: Account<'info, TimelineEvent>,
    #[account(seeds = [b"logistics", signer.key().as_ref()], bump)]
    pub logistics_role: Option<Account<'info, LogisticsRole>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String)]
pub struct UpdateLabReport<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"batch", id.as_bytes()], bump)]
    pub batch: Account<'info, Batch>,
    #[account(
        init,
        payer = signer,
        space = 8 + LabReport::INIT_SPACE,
        seeds = [b"lab", id.as_bytes(), &batch.lab_count.to_le_bytes()],
        bump
    )]
    pub lab_report: Account<'info, LabReport>,
    #[account(seeds = [b"lab_role", signer.key().as_ref()], bump)]
    pub lab_role: Option<Account<'info, LabRole>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String, lab_report_index: u32)]
pub struct AttestLabReport<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(seeds = [b"batch", id.as_bytes()], bump)]
    pub batch: Account<'info, Batch>,
    /// The existing LabReport being attested; must already exist at this index.
    #[account(seeds = [b"lab", id.as_bytes(), &lab_report_index.to_le_bytes()], bump)]
    pub lab_report: Account<'info, LabReport>,
    #[account(
        init,
        payer = signer,
        space = 8 + LabAttestation::INIT_SPACE,
        seeds = [b"attestation", id.as_bytes(), &lab_report_index.to_le_bytes()],
        bump
    )]
    pub attestation: Account<'info, LabAttestation>,
    #[account(seeds = [b"lab_role", signer.key().as_ref()], bump)]
    pub lab_role: Option<Account<'info, LabRole>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: verified to be the Solana instructions sysvar by the address constraint.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub ix_sysvar: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String, lab_report_index: u32)]
pub struct VerifyAttestation<'info> {
    #[account(seeds = [b"lab", id.as_bytes(), &lab_report_index.to_le_bytes()], bump)]
    pub lab_report: Account<'info, LabReport>,
    #[account(seeds = [b"attestation", id.as_bytes(), &lab_report_index.to_le_bytes()], bump)]
    pub attestation: Account<'info, LabAttestation>,
}

// ── account types ─────────────────────────────────────────────────

/// MIGRATION NOTE (Phase 2): two fields were added — `pending_authority` (+33 bytes)
/// and `paused` (+1 byte). Any already-deployed Config PDA must be reallocated by
/// +34 bytes (via `SystemProgram::transfer` + `account.realloc(new_size, false)`)
/// before upgrading the program binary.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub next_token_id: u64,
    pub pending_authority: Option<Pubkey>,
    pub paused: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Batch {
    #[max_len(MAX_ID_LEN)]
    pub id: String,
    #[max_len(MAX_FARM_LEN)]
    pub farm: String,
    #[max_len(MAX_PROVINCE_LEN)]
    pub province: String,
    #[max_len(MAX_DATE_LEN)]
    pub harvest_date: String,
    pub registrant: Pubkey,
    pub token_id: u64,
    pub timeline_count: u32,
    /// Index 0 is always the registration-time lab report created by `register_batch`.
    /// Subsequent `update_lab_report` calls occupy indices 1, 2, … and increment this
    /// counter after writing, so `lab_count` always equals the next available index.
    pub lab_count: u32,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct TimelineEvent {
    #[max_len(MAX_STAGE_LEN)]
    pub stage: String,
    #[max_len(MAX_LOCATION_LEN)]
    pub location: String,
    #[max_len(MAX_DATE_LEN)]
    pub date: String,
    pub status: TimelineStatus,
}

#[account]
#[derive(InitSpace)]
pub struct LabReport {
    pub cadmium_ppm: u64,
    pub threshold_ppm: u64,
    pub confidence: u64,
    pub risk_level: RiskLevel,
    #[max_len(MAX_AI_RESULT_LEN)]
    pub ai_result: String,
    #[max_len(MAX_RISK_CAUSE_LEN)]
    pub risk_cause: String,
    pub reporter: Pubkey,
    pub timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct LabAttestation {
    /// Which lab report (index into the batch's lab_count sequence) is attested.
    pub lab_report_index: u32,
    /// SHA-256 of the canonical payload bytes (see `compute_payload_hash`).
    pub payload_hash: [u8; 32],
    /// The Ed25519 signature that was verified by the native Ed25519SigVerify program.
    pub sig: [u8; 64],
    /// The lab's public key — must match the signer and the Ed25519 ix public key.
    pub lab_pubkey: Pubkey,
    pub timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct FarmerRole {}

#[account]
#[derive(InitSpace)]
pub struct LabRole {}

#[account]
#[derive(InitSpace)]
pub struct LogisticsRole {}

// ── enums ─────────────────────────────────────────────────────────

/// `#[repr(u8)]` makes the discriminant explicit and stable; `.as_u8()` is used
/// when including the level in the attested payload hash. The Borsh wire encoding
/// is a single byte (variant index), identical to the repr value.
///
/// Invalid discriminants are rejected automatically at instruction deserialisation —
/// callers cannot pass 255 or any out-of-range byte as a `RiskLevel`.
#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum RiskLevel {
    Safe = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

impl RiskLevel {
    pub fn as_u8(&self) -> u8 {
        self.clone() as u8
    }
}

/// Same guarantees as `RiskLevel` — invalid bytes are rejected at deserialisation.
#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum TimelineStatus {
    Pending = 0,
    InTransit = 1,
    Delivered = 2,
    Rejected = 3,
}

/// Used only in `RoleGranted` / `RoleRevoked` events — not stored in any account.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum RoleType {
    Farmer,
    Lab,
    Logistics,
}

// ── events ────────────────────────────────────────────────────────

#[event]
pub struct AuthorityTransferProposed {
    pub proposed: Pubkey,
    pub by: Pubkey,
}

#[event]
pub struct AuthorityTransferAccepted {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct ProgramPaused {
    pub by: Pubkey,
}

#[event]
pub struct ProgramUnpaused {
    pub by: Pubkey,
}

#[event]
pub struct RoleGranted {
    pub user: Pubkey,
    pub role: RoleType,
    pub granted_by: Pubkey,
}

#[event]
pub struct RoleRevoked {
    pub user: Pubkey,
    pub role: RoleType,
    pub revoked_by: Pubkey,
}

#[event]
pub struct BatchRegistered {
    pub id: String,
    pub batch: Pubkey,
    pub registrant: Pubkey,
    pub token_id: u64,
}

#[event]
pub struct TimelineEventAdded {
    pub id: String,
    pub batch: Pubkey,
    pub index: u32,
}

#[event]
pub struct LabReportUpdated {
    pub id: String,
    pub batch: Pubkey,
    pub index: u32,
    pub reporter: Pubkey,
}

#[event]
pub struct LabReportAttested {
    pub id: String,
    pub lab_report_index: u32,
    pub lab_pubkey: Pubkey,
    pub payload_hash: [u8; 32],
}

#[event]
pub struct AttestationVerified {
    pub id: String,
    pub lab_report_index: u32,
    pub lab_pubkey: Pubkey,
    pub payload_hash: [u8; 32],
}

// ── errors ────────────────────────────────────────────────────────

#[error_code]
pub enum DurianTrustError {
    #[msg("Signer is not authorized for this action.")]
    Unauthorized,
    #[msg("A provided string exceeds its configured byte length.")]
    StringTooLong,
    #[msg("A counter overflowed.")]
    CounterOverflow,
    #[msg("The append index is invalid.")]
    InvalidIndex,
    #[msg("The program is currently paused.")]
    Paused,
    #[msg("No pending authority transfer exists.")]
    NoPendingTransfer,
    #[msg("Date must be formatted as YYYY-MM-DD with a valid month (01-12) and day (01-31).")]
    InvalidDateFormat,
    #[msg("Transaction must include an Ed25519SigVerify instruction at index 0.")]
    MissingEd25519Instruction,
    #[msg("Instruction 0 is not a valid Ed25519SigVerify call or its data is malformed.")]
    InvalidEd25519Instruction,
    #[msg("Ed25519 public key in ix 0 does not match the transaction signer.")]
    AttestationKeyMismatch,
    #[msg("Ed25519 signature in ix 0 does not match the submitted signature.")]
    SignatureMismatch,
    #[msg("Recomputed payload hash does not match the submitted hash.")]
    PayloadHashMismatch,
}

// ── helper functions ──────────────────────────────────────────────

fn require_not_paused(config: &Account<'_, Config>) -> Result<()> {
    require!(!config.paused, DurianTrustError::Paused);
    Ok(())
}

fn require_authority(config: &Account<'_, Config>, authority: &Signer<'_>) -> Result<()> {
    require!(
        authority.key() == config.authority,
        DurianTrustError::Unauthorized
    );
    Ok(())
}

fn require_role_or_authority(
    config: &Account<'_, Config>,
    signer: &Signer<'_>,
    has_signer_role: bool,
) -> Result<()> {
    if signer.key() == config.authority || has_signer_role {
        Ok(())
    } else {
        err!(DurianTrustError::Unauthorized)
    }
}

fn validate_batch_strings(
    id: &str,
    farm: &str,
    province: &str,
    harvest_date: &str,
) -> Result<()> {
    validate_id(id)?;
    validate_string_len(farm, MAX_FARM_LEN)?;
    validate_string_len(province, MAX_PROVINCE_LEN)?;
    validate_date(harvest_date)?;
    Ok(())
}

fn validate_timeline_strings(stage: &str, location: &str, date: &str) -> Result<()> {
    validate_string_len(stage, MAX_STAGE_LEN)?;
    validate_string_len(location, MAX_LOCATION_LEN)?;
    validate_date(date)?;
    Ok(())
}

fn validate_lab_report_strings(ai_result: &str, risk_cause: &str) -> Result<()> {
    validate_string_len(ai_result, MAX_AI_RESULT_LEN)?;
    validate_string_len(risk_cause, MAX_RISK_CAUSE_LEN)?;
    Ok(())
}

fn validate_id(id: &str) -> Result<()> {
    validate_string_len(id, MAX_ID_LEN)
}

fn validate_string_len(value: &str, max_len: usize) -> Result<()> {
    require!(
        value.as_bytes().len() <= max_len,
        DurianTrustError::StringTooLong
    );
    Ok(())
}

/// Validates that `date` is exactly "YYYY-MM-DD" with a numeric year, month
/// 01–12, and day 01–31. Full calendar accuracy (leap years, month lengths)
/// is intentionally out of scope for on-chain validation.
fn validate_date(date: &str) -> Result<()> {
    let b = date.as_bytes();
    require!(b.len() == 10, DurianTrustError::InvalidDateFormat);
    require!(
        b[4] == b'-' && b[7] == b'-',
        DurianTrustError::InvalidDateFormat
    );
    for i in [0usize, 1, 2, 3, 5, 6, 8, 9] {
        require!(b[i].is_ascii_digit(), DurianTrustError::InvalidDateFormat);
    }
    let month = (b[5] - b'0') * 10 + (b[6] - b'0');
    let day = (b[8] - b'0') * 10 + (b[9] - b'0');
    require!(
        month >= 1 && month <= 12,
        DurianTrustError::InvalidDateFormat
    );
    require!(day >= 1 && day <= 31, DurianTrustError::InvalidDateFormat);
    Ok(())
}

/// Computes SHA-256 over the canonical attestation payload (see module-level comment
/// on `attest_lab_report` for the exact byte layout). Uses `hashv` to avoid
/// allocating a single concatenated buffer.
fn compute_payload_hash(
    id: &str,
    cadmium_ppm: u64,
    threshold_ppm: u64,
    confidence: u64,
    risk_level_byte: u8,
    ai_result: &str,
    risk_cause: &str,
    reporter: &[u8; 32],
) -> [u8; 32] {
    hashv(&[
        id.as_bytes(),
        &cadmium_ppm.to_le_bytes(),
        &threshold_ppm.to_le_bytes(),
        &confidence.to_le_bytes(),
        &[risk_level_byte],
        ai_result.as_bytes(),
        risk_cause.as_bytes(),
        reporter.as_ref(),
    ])
    .to_bytes()
}

/// Parses the Ed25519SigVerify instruction that must appear at ix index 0 and
/// verifies that it attests exactly `(expected_pubkey, expected_message, expected_sig)`.
///
/// Ed25519 instruction data layout (one entry):
///   [0]      count (u8)  — must be >= 1
///   [1]      padding (u8)
///   [2..3]   sig_offset (u16 LE)       offset of the signature within this ix data
///   [4..5]   sig_ix_index (u16 LE)     0xFFFF = current instruction
///   [6..7]   pubkey_offset (u16 LE)
///   [8..9]   pubkey_ix_index (u16 LE)
///   [10..11] msg_offset (u16 LE)
///   [12..13] msg_size (u16 LE)
///   [14..15] msg_ix_index (u16 LE)
///   [16+]    actual sig (64 B), pubkey (32 B), message (variable)
fn verify_ed25519_ix(
    ix_sysvar: &AccountInfo,
    expected_pubkey: &[u8; 32],
    expected_message: &[u8; 32],
    expected_sig: &[u8; 64],
) -> Result<()> {
    let current_index = load_current_index_checked(ix_sysvar)? as usize;
    require!(
        current_index > 0,
        DurianTrustError::MissingEd25519Instruction
    );

    let ed25519_ix = load_instruction_at_checked(0, ix_sysvar)
        .map_err(|_| DurianTrustError::MissingEd25519Instruction)?;
    require!(
        ed25519_ix.program_id == ed25519_program::ID,
        DurianTrustError::InvalidEd25519Instruction
    );

    let data = &ed25519_ix.data;
    // Minimum: 2-byte prefix + 14-byte entry header = 16 bytes
    require!(
        data.len() >= 16 && data[0] >= 1,
        DurianTrustError::InvalidEd25519Instruction
    );

    // Parse the first entry header (offset 2, one entry = 14 bytes)
    let sig_offset = u16::from_le_bytes([data[2], data[3]]) as usize;
    let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let msg_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    require!(
        data.len() >= sig_offset.saturating_add(64)
            && data.len() >= pubkey_offset.saturating_add(32)
            && data.len() >= msg_offset.saturating_add(msg_size),
        DurianTrustError::InvalidEd25519Instruction
    );

    let ix_pubkey = &data[pubkey_offset..pubkey_offset + 32];
    let ix_message = &data[msg_offset..msg_offset + msg_size];
    let ix_sig = &data[sig_offset..sig_offset + 64];

    require!(
        ix_pubkey == expected_pubkey,
        DurianTrustError::AttestationKeyMismatch
    );
    require!(
        msg_size == 32 && ix_message == expected_message,
        DurianTrustError::PayloadHashMismatch
    );
    require!(
        ix_sig == expected_sig,
        DurianTrustError::SignatureMismatch
    );

    Ok(())
}
