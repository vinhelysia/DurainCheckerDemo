import type { BN } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'

// --- On-chain account types (Anchor deserialization of the IDL) ---
// u64/i64 → BN, u32/u8 → number, pubkey → PublicKey, string → string

export interface BatchAccount {
  id: string
  farm: string
  province: string
  harvestDate: string
  cadmiumPpm: BN
  thresholdPpm: BN
  confidence: BN
  riskLevel: number
  aiResult: string
  riskCause: string
  registrant: PublicKey
  tokenId: BN
  timelineCount: number
  labCount: number
  createdAt: BN
}

export interface TimelineEventAccount {
  stage: string
  location: string
  date: string
  status: number
}

export interface LabReportAccount {
  cadmiumPpm: BN
  thresholdPpm: BN
  confidence: BN
  riskLevel: number
  aiResult: string
  riskCause: string
  reporter: PublicKey
  timestamp: BN
}

export interface ConfigAccount {
  authority: PublicKey
  nextTokenId: BN
}

// --- UI/presentation types (after mapping from chain) ---

export type RiskLevel = 'low' | 'medium' | 'high'

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
}

export interface UIBatchSummary {
  id: string
  riskLevel: RiskLevel
}

// --- Strongly-typed interface for the dynamically-loaded Anchor Program ---
// Used in hooks to avoid `any` at the program call-sites.

export interface DurianTrustProgram {
  programId: PublicKey
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
  }
  methods: Record<string, (...args: unknown[]) => {
    accounts(accs: Record<string, PublicKey | null>): { rpc(): Promise<string> }
  }>
}
