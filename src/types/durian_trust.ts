import type { BN } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'

// --- On-chain account types (Anchor deserialization of the IDL) ---
// u64/i64 → BN, u32/u8 → number, pubkey → PublicKey, string → string

// Anchor encodes/decodes Rust enums as single-key objects, e.g. { low: {} }.
// Never pass raw numbers — instruction encoding fails before Phantom signs.
export type ChainEnum = Record<string, Record<string, never>>

/** RiskLevel on-chain: Safe | Low | Medium | High | Critical — UI only uses low/medium/high. */
export type AnchorRiskLevel =
  | { safe: Record<string, never> }
  | { low: Record<string, never> }
  | { medium: Record<string, never> }
  | { high: Record<string, never> }
  | { critical: Record<string, never> }

/** TimelineStatus on-chain: Pending | InTransit | Delivered | Rejected */
export type AnchorTimelineStatus =
  | { pending: Record<string, never> }
  | { inTransit: Record<string, never> }
  | { delivered: Record<string, never> }
  | { rejected: Record<string, never> }

export interface BatchAccount {
  id: string
  farm: string
  province: string
  harvestDate: string
  registrant: PublicKey
  tokenId: BN
  timelineCount: number
  labCount: number
  createdAt: BN
  /// Current custody holder — moves along the export chain.
  owner: PublicKey
  /// Nominated next holder; null unless a handoff is awaiting acceptance.
  pendingOwner: PublicKey | null
  custodyCount: number
}

export interface CustodyRecordAccount {
  from: PublicKey
  to: PublicKey
  role: ChainEnum
  location: string
  timestamp: BN
}

export interface TimelineEventAccount {
  stage: string
  location: string
  date: string
  status: ChainEnum
}

export interface LabReportAccount {
  cadmiumPpm: BN
  thresholdPpm: BN
  confidence: BN
  riskLevel: ChainEnum
  aiResult: string
  riskCause: string
  reporter: PublicKey
  timestamp: BN
}

// --- UI/presentation types (after mapping from chain) ---

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown'

export interface LocalizedString {
  vi: string
  en: string
}

export interface UILabReport {
  cadmiumPpm: number
  thresholdPpm: number
  aiResult: LocalizedString
  confidence: number
  riskLevel: RiskLevel
  riskCause: LocalizedString
  timestamp: number
  reporter: string
}

export interface UITimelineEvent {
  stage: LocalizedString
  location: LocalizedString
  date: string
  status: 'complete' | 'pending'
}

export type CustodyRole = 'farmer' | 'packer' | 'exporter' | 'importer' | 'customs'

export interface UICustodyRecord {
  from: string
  to: string
  role: CustodyRole
  location: string
  timestamp: number
}

export interface UIBatch {
  id: string
  tokenId: number
  farm: LocalizedString
  province: LocalizedString
  harvestDate: string
  cadmiumPpm: number
  thresholdPpm: number
  aiResult: LocalizedString
  confidence: number
  riskLevel: RiskLevel
  riskCause: LocalizedString
  timeline: UITimelineEvent[]
  blockchainHash: string
  labReports: UILabReport[]
  /// Custody chain. Empty on fallback/simulated batches, which have no owner.
  custody?: UICustodyRecord[]
  owner?: string
  pendingOwner?: string | null
}

export interface UIBatchSummary {
  id: string
  riskLevel: RiskLevel
}

// --- Strongly-typed interface for the dynamically-loaded Anchor Program ---
// Used in hooks to avoid `any` at the program call-sites.

export interface DurianTrustProgram {
  programId: PublicKey
  coder: {
    accounts: {
      decode<T>(name: string, data: Buffer): T
    }
  }
  account: {
    batch: {
      all(): Promise<Array<{ account: BatchAccount }>>
      fetch(pda: PublicKey): Promise<BatchAccount>
    }
    timelineEvent: {
      fetchMultiple(pdas: PublicKey[]): Promise<Array<TimelineEventAccount | null>>
    }
    labReport: {
      fetchMultiple(pdas: PublicKey[]): Promise<Array<LabReportAccount | null>>
    }
    custodyRecord: {
      fetchMultiple(pdas: PublicKey[]): Promise<Array<CustodyRecordAccount | null>>
    }
  }
  methods: {
    registerBatch: (
      batchId: string,
      farm: string,
      province: string,
      harvestDate: string,
      cadmiumPpm: BN,
      thresholdPpm: BN,
      confidence: BN,
      riskLevel: AnchorRiskLevel,
      aiResult: string,
      riskCause: string
    ) => MethodBuilder
    updateLabReport: (
      batchId: string,
      cadmiumPpm: BN,
      thresholdPpm: BN,
      confidence: BN,
      riskLevel: AnchorRiskLevel,
      aiResult: string,
      riskCause: string
    ) => MethodBuilder
    addTimelineEvent: (
      batchId: string,
      stage: string,
      location: string,
      date: string,
      status: AnchorTimelineStatus
    ) => MethodBuilder
    [method: string]: (...args: unknown[]) => MethodBuilder
  }
}

type MethodBuilder = {
  accounts(accs: Record<string, PublicKey | null>): { rpc(): Promise<string> }
}
