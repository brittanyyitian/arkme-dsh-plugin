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
  mode: 'login' | 'source' | 'recordings' | 'search' | 'extensions' | 'arko'
    | 'settings' | 'task-start' | 'task-session'
  selectedSource?: ArkmeSourceItem
  recordingTarget?: { dateStamp: number; startAtMillis: number }
  extensionShareRef?: string
  calendarOpen?: boolean
}

export class ArkmeUiController {
  private state: ArkmeUiState = { authRevision: 0, chatRevision: 0, mode: 'login' }
  private lastConversationSource: ArkmeSourceItem | undefined
  private readonly listeners = new Set<() => void>()
  private settingsOpener: (() => void) | undefined

  readonly getSnapshot = (): ArkmeUiState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  bindSettingsOpener(opener: () => void): () => void {
    this.settingsOpener = opener
    return () => { if (this.settingsOpener === opener) this.settingsOpener = undefined }
  }

  openDshSettings(): void {
    this.settingsOpener?.()
  }

  focusSendToSelf(): void {
    this.lastConversationSource = undefined
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'source' })
  }

  authChanged(authenticated = false, resetSelection = false): void {
    if (authenticated) {
      const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...stateWithoutSelection } = this.state
      const { calendarOpen: _activeCalendar, ...stateWithoutCalendar } = this.state
      const state = resetSelection ? stateWithoutSelection : stateWithoutCalendar
      this.publish({
        ...state,
        mode: state.mode === 'login' ? 'source' : state.mode,
        authRevision: this.state.authRevision + 1,
      })
      return
    }
    this.lastConversationSource = undefined
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
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
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'login' })
  }

  showRecordings(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'recordings' })
  }

  showCalendar(): void {
    if (this.state.calendarOpen === true) {
      const { calendarOpen: _calendarOpen, ...rest } = this.state
      this.publish(rest)
      return
    }
    this.publish({ ...this.state, calendarOpen: true })
  }

  hideCalendar(): void {
    const { calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish(rest)
  }

  showRecordingTarget(dateStamp: number, startAtMillis: number): void {
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'recordings', recordingTarget: { dateStamp, startAtMillis } })
  }

  showSearch(): void {
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'search' })
  }

  showExtensions(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'extensions' })
  }

  showConversations(): void {
    const { recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({
      ...rest,
      mode: 'source',
      ...(this.lastConversationSource === undefined ? {} : { selectedSource: this.lastConversationSource }),
    })
  }

  showArko(): void {
    const { selectedSource: _selectedSource, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'arko' })
  }

  showSettings(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'settings' })
  }

  showNewTask(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'task-start' })
  }

  showTaskSession(): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'task-session' })
  }

  openExtensionShare(shareRef: string): void {
    const { selectedSource: _selectedSource, recordingTarget: _recordingTarget, calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'source', extensionShareRef: shareRef })
  }

  dismissExtensionShare(): void {
    const { extensionShareRef: _extensionShareRef, ...rest } = this.state
    this.publish(rest)
  }

  selectSource(source: ArkmeSourceItem): void {
    this.lastConversationSource = source
    const { calendarOpen: _calendarOpen, ...rest } = this.state
    this.publish({ ...rest, mode: 'source', selectedSource: source })
  }

  private publish(next: ArkmeUiState): void {
    if (next.authRevision === this.state.authRevision
      && next.chatRevision === this.state.chatRevision
      && next.mode === this.state.mode
      && next.calendarOpen === this.state.calendarOpen
      && next.recordingTarget?.dateStamp === this.state.recordingTarget?.dateStamp
      && next.recordingTarget?.startAtMillis === this.state.recordingTarget?.startAtMillis
      && next.extensionShareRef === this.state.extensionShareRef
      && sameSource(next.selectedSource, this.state.selectedSource)) return
    this.state = next
    for (const listener of this.listeners) listener()
  }
}

export const arkmeUi = new ArkmeUiController()
