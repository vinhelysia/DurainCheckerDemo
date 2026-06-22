use anchor_lang::prelude::*;

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

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.next_token_id = 0;
        Ok(())
    }

    pub fn add_farmer(ctx: Context<AddFarmer>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn remove_farmer(ctx: Context<RemoveFarmer>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn add_lab(ctx: Context<AddLab>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn remove_lab(ctx: Context<RemoveLab>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn add_logistics(ctx: Context<AddLogistics>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn remove_logistics(ctx: Context<RemoveLogistics>, _user: Pubkey) -> Result<()> {
        require_authority(&ctx.accounts.config, &ctx.accounts.authority)
    }

    pub fn register_batch(
        ctx: Context<RegisterBatch>,
        id: String,
        farm: String,
        province: String,
        harvest_date: String,
        cadmium_ppm: u64,
        threshold_ppm: u64,
        confidence: u64,
        risk_level: u8,
        ai_result: String,
        risk_cause: String,
    ) -> Result<()> {
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
        status: u8,
    ) -> Result<()> {
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
        risk_level: u8,
        ai_result: String,
        risk_cause: String,
    ) -> Result<()> {
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
}

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

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub next_token_id: u64,
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
    pub status: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LabReport {
    pub cadmium_ppm: u64,
    pub threshold_ppm: u64,
    pub confidence: u64,
    pub risk_level: u8,
    #[max_len(MAX_AI_RESULT_LEN)]
    pub ai_result: String,
    #[max_len(MAX_RISK_CAUSE_LEN)]
    pub risk_cause: String,
    pub reporter: Pubkey,
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
    validate_string_len(harvest_date, MAX_DATE_LEN)?;
    Ok(())
}

fn validate_timeline_strings(stage: &str, location: &str, date: &str) -> Result<()> {
    validate_string_len(stage, MAX_STAGE_LEN)?;
    validate_string_len(location, MAX_LOCATION_LEN)?;
    validate_string_len(date, MAX_DATE_LEN)?;
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
