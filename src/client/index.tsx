import type { ClientContext, ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import './composer-draft-auth-binding.js'
import { ArkmeFooterAction } from './ArkmeFooterAction.js'
import { ArkmeFooterDropdown } from './ArkmeFooterDropdown.js'
import { ArkmeSettingsRow } from './ArkmeSettingsRow.js'
import { ArkmeStartupAuthGate, startupAuthGateEnabled } from './ArkmeStartupAuthGate.js'
import { watchOfficialConversationSelection, watchOfficialNewSession } from './new-session-activation.js'
import { arkmePluginUpdateStore } from './plugin-update-store.js'
import { arkmeUi } from './ui-controller.js'
import { ArkmeRootFrame, installArkmeRedesignStyles } from './redesign/ArkmeRootFrame.js'
import { ArkmeLayoutController } from './redesign/layout-controller.js'
import { ArkmeThemePresenter } from './redesign/theme-presenter.js'
import { resolveArkmeTaskSession } from './redesign/task-session.js'

export const inject = ['slots', 'theme', 'sessions', 'workspaces']

/** Register Arkme only through official additive DSH slots. */
export function apply(ctx: ClientContext): void {
  const redesignLayout = new ArkmeLayoutController()
  // The combined Host+browser TypeScript program also sees the Host SessionStore
  // declaration. At runtime this browser plugin receives the client ISessions face.
  const sessions = ctx.sessions as unknown as ISessions
  let openedFromSession: SessionId | undefined
  let stopWatchingConversationSelection: (() => void) | undefined
  let stopWatchingNewSession: (() => void) | undefined
  const closeSurface = () => {
    openedFromSession = undefined
    arkmeUi.deactivateSurface()
  }
  const closeArkme = () => {
    const stopConversationSelection = stopWatchingConversationSelection
    stopWatchingConversationSelection = undefined
    stopConversationSelection?.()
    const stop = stopWatchingNewSession
    stopWatchingNewSession = undefined
    stop?.()
    closeSurface()
    arkmeUi.close()
  }
  const activateSurface = (session: SessionId | undefined) => {
    openedFromSession = session
    arkmeUi.activateSurface()
  }
  const watchOfficialNavigation = () => {
    if (stopWatchingConversationSelection === undefined) {
      stopWatchingConversationSelection = watchOfficialConversationSelection(closeSurface)
    }
    if (stopWatchingNewSession === undefined) stopWatchingNewSession = watchOfficialNewSession(closeArkme)
  }
  const openArkme = (session: SessionId | undefined) => {
    watchOfficialNavigation()
    const retained = arkmeUi.getSnapshot().selectedSource
    if (retained !== undefined) arkmeUi.open()
    else arkmeUi.focusSendToSelf()
    activateSurface(session)
  }
  const openLogin = (session: SessionId | undefined) => {
    watchOfficialNavigation()
    openedFromSession = session
    arkmeUi.showLoginSurface()
  }
  const toggleArkme = (openedFromSession: SessionId | undefined, authenticated: boolean) => {
    if (arkmeUi.getSnapshot().open) { closeArkme(); return }
    if (authenticated) openArkme(openedFromSession)
    else openLogin(openedFromSession)
  }

  ctx.effect(() => () => { closeArkme() }, 'dsh-arkme: close floating surface on dispose')
  ctx.effect(() => arkmePluginUpdateStore.start(), 'dsh-arkme: client plugin update status')

  ctx.effect(() => {
    const disposeStyles = installArkmeRedesignStyles()
    const disposeLayout = ctx.reflect.provide('layout', redesignLayout)
    const disposeRoot = ctx.slots.register({
      name: 'root',
      children: {
        sidebar: { kind: 'single', scope: 'root' },
        conversation: { kind: 'single', scope: 'session-maybe' },
        details: { kind: 'single', scope: 'session' },
        'shell.overlay': { kind: 'list', scope: 'root' },
        'arkme.directory.entry': { kind: 'list', scope: 'root' },
      },
      inject: () => ({
        layout: redesignLayout,
        startSession: options => resolveArkmeTaskSession(ctx.workspaces, sessions, options),
        pickDirectory: () => ctx.workspaces.pickDirectory(),
        listDirectory: (path, signal) => ctx.workspaces.listDirectory(path, signal),
        openSession: (sessionId: SessionId) => { sessions.open(sessionId) },
        sendPrompt: async (sessionId: SessionId, text: string) => {
          const session = sessions.binding(sessionId)?.session
          if (session === undefined) throw new Error('任务会话尚未准备好，请稍后重试')
          const result = await session.prompt([{ type: 'text', text }], 'queue')
          if (!result.ok) throw new Error(result.error.message)
        },
      }),
    }, ArkmeRootFrame)
    return () => {
      disposeRoot()
      disposeLayout()
      disposeStyles()
    }
  }, 'dsh-arkme: redesign root layout')

  ctx.effect(() => {
    const presenter = new ArkmeThemePresenter()
    presenter.apply(ctx.theme.getTheme())
    const off = ctx.on('theme/change', snapshot => { presenter.apply(snapshot) })
    return () => {
      off()
      presenter.dispose()
    }
  }, 'dsh-arkme: redesign theme presenter')

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'arkme',
    order: 70,
    label: 'Arkme',
    inject: () => ({
      toggle: toggleArkme,
      activate: activateSurface,
      closeSurface,
      surfaceSession: () => openedFromSession,
    }),
  }, ArkmeFooterDropdown))

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'arkme-account',
    order: 80,
    label: 'Arkme',
  }, ArkmeSettingsRow))

  if (startupAuthGateEnabled()) {
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'arkme-startup-auth-gate',
      order: 100,
      label: 'Arkme 启动认证门禁',
    }, ArkmeStartupAuthGate))
  }
}

export { ArkmeFooterAction } from './ArkmeFooterAction.js'
export { ArkmeFooterDropdown } from './ArkmeFooterDropdown.js'
export { ArkmeOutgoingCallHost, outgoingCallModalLayout } from './ArkmeOutgoingCallHost.js'
export { ArkmePrivateCallMenu } from './ArkmePrivateCallMenu.js'
export { ArkmeSettingsRow } from './ArkmeSettingsRow.js'
export { ArkmeStartupAuthGate } from './ArkmeStartupAuthGate.js'
export { ArkmeConversationSurface } from './ArkmeConversationSurface.js'
export { ArkmeRecordingSurface } from './ArkmeRecordingSurface.js'
export { ArkmeSearchSurface } from './ArkmeSearchSurface.js'
export { ArkmeArkoSurface } from './ArkmeArkoSurface.js'
export { ArkmeExtensionCenter } from './ArkmeExtensionCenter.js'
export {
  ArkmeExtensionReviewComposerDialog,
  ArkmeExtensionReviews,
  extensionRatingLabel,
  extensionReviewTree,
} from './ArkmeExtensionReviews.js'
export { ArkmeSurface } from './ArkmeSidebar.js'
export { ArkmeRootFrame } from './redesign/ArkmeRootFrame.js'
export { ArkmeLayoutController } from './redesign/layout-controller.js'
export { ArkmeDirectoryRow, ArkmeNavigation, renderArkmeDirectoryRow } from './ArkmeVirtualWorkspace.js'
export type { ArkmeDirectoryEntryOwnerProps, ArkmeDirectoryRowProps } from './slots-contract.js'
export { outgoingCallUi } from './outgoing-call-ui-controller.js'
export { ArkmePluginUpdateStore, arkmePluginUpdateStore } from './plugin-update-store.js'
export {
  isOfficialConversationTarget, isOfficialNewSessionTarget,
  watchOfficialConversationSelection, watchOfficialNewSession,
} from './new-session-activation.js'
