import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import './composer-draft-auth-binding.js'
import { ArkmeHeroBrandMark, ArkmeSidebarBrandMark, ArkmeSidebarBrandName } from './ArkmeBrand.js'
import { ArkmeFooterAction } from './ArkmeFooterAction.js'
import { ArkmeFooterDropdown } from './ArkmeFooterDropdown.js'
import { ArkmeSettingsRow } from './ArkmeSettingsRow.js'
import { ArkmeStartupAuthGate, startupAuthGateEnabled } from './ArkmeStartupAuthGate.js'
import { watchOfficialConversationSelection, watchOfficialNewSession } from './new-session-activation.js'
import { arkmePluginUpdateStore } from './plugin-update-store.js'
import { arkmeUi } from './ui-controller.js'
import { consumeExtensionShareDeepLink } from './extension-share-deeplink.js'

export const inject = ['slots']

/** Register Arkme only through official additive DSH slots. */
export function apply(ctx: ClientContext): void {
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
	if (typeof window !== 'undefined' && window.location !== undefined && window.history !== undefined) {
		const shareRef = consumeExtensionShareDeepLink(window.location, window.history)
		if (shareRef !== undefined) arkmeUi.openExtensionShare(shareRef)
	}

  ctx.effect(() => () => { closeArkme() }, 'dsh-arkme: close floating surface on dispose')
  ctx.effect(() => arkmePluginUpdateStore.start(), 'dsh-arkme: client plugin update status')

  // DSH's single brand slots support priority shadowing. A lower priority value
  // safely replaces the official visuals without touching host source or DOM.
  ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.inject('sidebar.brand.name', () => (
    ctx.slots.inject('conversation.hero.brand.mark', function* registerArkmeBrand() {
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -10 }, ArkmeSidebarBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -10 }, ArkmeSidebarBrandName)
      yield ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -10 }, ArkmeHeroBrandMark)
    })
  )))

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'arkme',
    order: 70,
    label: 'Arkme',
    children: {
      'arkme.directory.entry': { kind: 'list', scope: 'root' },
    },
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
export { ArkmeHeroBrandMark, ArkmeSidebarBrandMark, ArkmeSidebarBrandName } from './ArkmeBrand.js'
export { ArkmeFooterDropdown } from './ArkmeFooterDropdown.js'
export { ArkmeOutgoingCallHost, outgoingCallModalLayout } from './ArkmeOutgoingCallHost.js'
export { ArkmePrivateCallMenu } from './ArkmePrivateCallMenu.js'
export { ArkmeSettingsRow } from './ArkmeSettingsRow.js'
export { ArkmeStartupAuthGate } from './ArkmeStartupAuthGate.js'
export { ArkmeConversationSurface } from './ArkmeConversationSurface.js'
export { ArkmeCalendarSurface } from './ArkmeCalendarSurface.js'
export { ArkmeRecordingSurface } from './ArkmeRecordingSurface.js'
export { ArkmeSearchSurface } from './ArkmeSearchSurface.js'
export { ArkmeArkoSurface } from './ArkmeArkoSurface.js'
export { ArkmeExtensionCenter } from './ArkmeExtensionCenter.js'
export { ArkmeSharedExtensionDetail } from './ArkmeSharedExtensionDetail.js'
export { consumeExtensionShareDeepLink, extensionShareRefFromHash } from './extension-share-deeplink.js'
export {
  ArkmeExtensionReviewComposerDialog,
  ArkmeExtensionReviews,
  extensionRatingLabel,
  extensionReviewTree,
} from './ArkmeExtensionReviews.js'
export { ArkmeSurface } from './ArkmeSidebar.js'
export { ArkmeProductNavigation } from './ArkmeProductNavigation.js'
export { ArkmeDirectoryRow, ArkmeNavigation, renderArkmeDirectoryRow } from './ArkmeVirtualWorkspace.js'
export type { ArkmeDirectoryEntryOwnerProps, ArkmeDirectoryRowProps } from './slots-contract.js'
export { outgoingCallUi } from './outgoing-call-ui-controller.js'
export { ArkmePluginUpdateStore, arkmePluginUpdateStore } from './plugin-update-store.js'
export {
  isOfficialConversationTarget, isOfficialNewSessionTarget,
  watchOfficialConversationSelection, watchOfficialNewSession,
} from './new-session-activation.js'
