import type {
  ArkmeAiVideoJob,
  ArkmeAiVideoPreflightResult,
  ArkmeAiVideoSegmentSelector,
} from '../../types.js'

export interface ArkmeAiVideoToolPort {
  aiVideoPreflight(
    sessionId: string,
    segments: readonly ArkmeAiVideoSegmentSelector[],
    signal?: AbortSignal,
  ): Promise<ArkmeAiVideoPreflightResult>
  aiVideoCreate(
    clientRequestId: string,
    sessionId: string,
    segments: readonly ArkmeAiVideoSegmentSelector[],
    preflightProof: string,
    signal?: AbortSignal,
  ): Promise<ArkmeAiVideoJob>
  aiVideoStatus(jobId: string, signal?: AbortSignal): Promise<ArkmeAiVideoJob>
  textAiVideoPreflight(
    title: string,
    texts: readonly string[],
    signal?: AbortSignal,
  ): Promise<ArkmeAiVideoPreflightResult>
  textAiVideoCreate(
    clientRequestId: string,
    title: string,
    texts: readonly string[],
    preflightProof: string,
    signal?: AbortSignal,
  ): Promise<ArkmeAiVideoJob>
}
