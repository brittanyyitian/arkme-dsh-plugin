import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CaretRight } from '@phosphor-icons/react/CaretRight'
import type { ArkmeAuthSnapshot, ArkmeUserProfile, ArkmeUserProfileSnapshot } from '../types.js'
import { callArkme } from './api.js'
import { ArkmeUserAvatar } from './ArkmeAvatar.js'
import { arkmeAuthStore } from './auth-store.js'
import { clearLastNavigationCache } from './navigation-cache.js'
import { arkmeUi } from './ui-controller.js'

interface SettingsRowProps {
  title: string
  description: string
  href?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

function SettingsRow({ title, description, href, onClick, danger = false, disabled = false }: SettingsRowProps) {
  const interactive = href !== undefined || onClick !== undefined
  const body: ReactNode = <>
    <strong className={danger ? 'is-danger' : ''}>{title}</strong>
    <span className="arkme-redesign-setting-summary">{description}</span>
    {interactive ? <CaretRight size={15} aria-hidden /> : <span aria-hidden />}
  </>

  if (href !== undefined) {
    return <a className="arkme-redesign-setting-row" href={href} target="_blank" rel="noreferrer">{body}</a>
  }
  if (onClick !== undefined) {
    return <button type="button" className="arkme-redesign-setting-row" disabled={disabled} onClick={onClick}>{body}</button>
  }
  return <div className="arkme-redesign-setting-row">{body}</div>
}

function SettingsGroup({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section className="arkme-redesign-settings-group" {...(id === undefined ? {} : { id })}>
    <h2>{title}</h2>
    <div>{children}</div>
  </section>
}

export function ArkmeSettingsSurface() {
  const authState = useSyncExternalStore(arkmeAuthStore.subscribe, arkmeAuthStore.getSnapshot)
  const [profile, setProfile] = useState<ArkmeUserProfile>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authState.auth?.status !== 'authenticated') {
      setProfile(undefined)
      return
    }
    let active = true
    const controller = new AbortController()
    void callArkme<ArkmeUserProfileSnapshot>('user.profile', undefined, controller.signal)
      .then(async snapshot => snapshot.profile === null
        ? await callArkme<ArkmeUserProfileSnapshot>('user.profile.refresh', undefined, controller.signal)
        : snapshot)
      .then(snapshot => { if (active && snapshot.profile !== null) setProfile(snapshot.profile) })
      .catch(caught => {
        if (active && !controller.signal.aborted) setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => { active = false; controller.abort() }
  }, [authState.auth?.status, authState.auth?.status === 'authenticated' ? authState.auth.userId : undefined])

  const logout = async () => {
    setBusy(true)
    setError('')
    try {
      const snapshot = await callArkme<ArkmeAuthSnapshot>('auth.logout')
      arkmeAuthStore.setAuth(snapshot)
      clearLastNavigationCache()
      arkmeUi.authChanged(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const displayName = profile?.displayName.trim() || profile?.nickname.trim() || '我的账户'
  const contact = profile?.contact.phoneMasked ?? profile?.contact.emailMasked ?? '已通过 Arkme 登录'

  return <div className="arkme-redesign-settings-surface" aria-label="我的账户">
    <div className="arkme-redesign-settings-shell">
      <div className="arkme-redesign-settings-profile">
        <ArkmeUserAvatar {...(profile?.avatarRef ? { avatarRef: profile.avatarRef } : {})} size={56} label="当前用户头像" />
        <div>
          <h1>{displayName}</h1>
          <p>{profile?.arkmeId ? `即我号 ${profile.arkmeId}` : '即我号读取中…'}</p>
        </div>
      </div>

      <SettingsGroup title="账户" id="arkme-settings-account">
        <SettingsRow title="个人资料" description={profile === undefined ? '正在读取账户资料' : '头像、昵称与即我号'} />
        <SettingsRow title="登录与安全" description={contact} />
        <SettingsRow danger title={busy ? '正在退出…' : '退出登录'} description="退出当前 Arkme 账户" disabled={busy} onClick={() => { void logout() }} />
      </SettingsGroup>

      {error !== '' && <div className="arkme-redesign-settings-error" role="alert">{error}</div>}
    </div>
  </div>
}
