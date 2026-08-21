import type { ArkmeSourceItem } from '../types.js'

function sameSource(left: ArkmeSourceItem | undefined, right: ArkmeSourceItem | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.sourceRef === right.sourceRef && left.kind === right.kind && left.displayName === right.displayName
    && left.latestPreview === right.latestPreview && left.activeAtMillis === right.activeAtMillis
    && left.unreadCount === right.unreadCount && left.isMuted === right.isMuted
    && left.latestSequence === right.latestSequence
    && left.avatarRef === right.avatarRef && (left.avatarRefs ?? []).join('|') === (right.avatarRefs ?? []).join('|')
    && JSON.stringify(left.groupAvatar) === JSON.stringify(right.groupAvatar)
}

export interface ArkmeUiState {
  authRevision: number
  chatRevision: number
  mode: 'login' | 'source' | 'recordings' | 'calendar' | 'search' | 'extensions' | 'arko'
  selectedSource?: ArkmeSourceItem
  recordingTarget?: { dateStamp: number; startAtMillis: number }
  extensionShareRef?: string
}

export class ArkmeUiController {
  private state: ArkmeUiState = { authRevision: 0, chatRevision: 0, mode: 'login' }
  private lastConversationSource: ArkmeSourceItem | undefined
  private readonly listeners = new Set<() => void>()

  readonly getSnapshot = (): ArkmeUiState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  focusSendToSelf(): void {
    this.lastConversationSource = undefined
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({ ...rest, mode: 'source' })
  }

  authChanged(authenticated = false, resetSelection = false): void {
    if (authenticated) {
      const { selectedSource: _selectedSource, ...stateWithoutSelection } = this.state
      const state = resetSelection ? stateWithoutSelection : this.state
      this.publish({
        ...state,
        mode: state.mode === 'login' ? 'source' : state.mode,
        authRevision: this.state.authRevision + 1,
      })
      return
    }
    this.lastConversationSource = undefined
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({
      ...rest,
      mode: 'login',
      authRevision: this.state.authRevision + 1,
    })
  }

  chatChanged(): void {
    this.publish({ ...this.state, chatRevision: this.state.chatRevision + 1 })
  }

  showLogin(): void {
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({ ...rest, mode: 'login' })
  }

  showRecordings(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, ...rest } = this.state
    this.publish({ ...rest, mode: 'recordings' })
  }

  showCalendar(): void {
    const { recordingTarget: _recordingTarget, ...rest } = this.state
    this.publish({ ...rest, mode: 'calendar' })
  }

  showRecordingTarget(dateStamp: number, startAtMillis: number): void {
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({ ...rest, mode: 'recordings', recordingTarget: { dateStamp, startAtMillis } })
  }

  showSearch(): void {
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({ ...rest, mode: 'search' })
  }

  showExtensions(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, ...rest } = this.state
    this.publish({ ...rest, mode: 'extensions' })
  }

  showConversations(): void {
    const { recordingTarget: _recordingTarget, ...rest } = this.state
    this.publish({
      ...rest,
      mode: 'source',
      ...(this.lastConversationSource === undefined ? {} : { selectedSource: this.lastConversationSource }),
    })
  }

  showArko(): void {
    const { selectedSource: _selectedSource, ...rest } = this.state
    this.publish({ ...rest, mode: 'arko' })
  }

  openExtensionShare(shareRef: string): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, ...rest } = this.state
    this.publish({ ...rest, mode: 'source', extensionShareRef: shareRef })
  }

  dismissExtensionShare(): void {
    const { extensionShareRef: _extensionShareRef, ...rest } = this.state
    this.publish(rest)
  }

  selectSource(source: ArkmeSourceItem): void {
    this.lastConversationSource = source
    this.publish({ ...this.state, mode: 'source', selectedSource: source })
  }

  private publish(next: ArkmeUiState): void {
    if (next.authRevision === this.state.authRevision
      && next.chatRevision === this.state.chatRevision
      && next.mode === this.state.mode
      && next.recordingTarget?.dateStamp === this.state.recordingTarget?.dateStamp
      && next.recordingTarget?.startAtMillis === this.state.recordingTarget?.startAtMillis
      && next.extensionShareRef === this.state.extensionShareRef
      && sameSource(next.selectedSource, this.state.selectedSource)) return
    this.state = next
    for (const listener of this.listeners) listener()
  }
}

export const arkmeUi = new ArkmeUiController()
