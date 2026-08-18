import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ComponentType } from 'react'
import type { JotmoRecordingCalendarDay } from '../src/types.js'
import * as recordingSurface from '../src/client/JotmoRecordingSurface.js'

const { JotmoRecordingSurface } = recordingSurface

function styleMap(value: string): Map<string, string> {
  return new Map(value.split(';').filter(Boolean).map(rule => {
    const separator = rule.indexOf(':')
    return [rule.slice(0, separator), rule.slice(separator + 1)]
  }))
}

function matchStyle(markup: string, pattern: RegExp): Map<string, string> {
  const match = pattern.exec(markup)
  expect(match?.[1]).toBeDefined()
  return styleMap(match?.[1] ?? '')
}

describe('JotmoRecordingSurface layout', () => {
  it('keeps page chrome fixed and scrolls only the active tab pane', () => {
    const markup = renderToStaticMarkup(<JotmoRecordingSurface />)
    const root = matchStyle(markup, /^<div style="([^"]+)"/)
    const detail = matchStyle(markup, /<section style="([^"]+)" aria-label="录音详情">/)
    const pane = matchStyle(markup, /<\/nav><div style="([^"]+)">/)

    expect(root.get('overflow')).toBe('hidden')
    expect(detail.get('display')).toBe('flex')
    expect(detail.get('flex-direction')).toBe('column')
    expect(detail.get('height')).toBe('100%')
    expect(detail.get('min-height')).toBe('0')
    expect(pane.get('flex')).toBe('1')
    expect(pane.get('min-height')).toBe('0')
    expect(pane.get('overflow-y')).toBe('auto')
    expect(pane.get('overscroll-behavior')).toBe('contain')
  })

  it('shows only the date and duration for a recorded calendar day', () => {
    type CalendarCellProps = {
      date: Date
      meta: JotmoRecordingCalendarDay
      selected: boolean
      isToday: boolean
      onClick(): void
    }
    const RecordingCalendarCell = (recordingSurface as unknown as {
      RecordingCalendarCell?: ComponentType<CalendarCellProps>
    }).RecordingCalendarCell

    expect(RecordingCalendarCell).toBeDefined()
    if (RecordingCalendarCell === undefined) return

    const markup = renderToStaticMarkup(<RecordingCalendarCell
      date={new Date(2026, 6, 9)}
      meta={{ dateStamp: new Date(2026, 6, 9).getTime(), durationMillis: 59 * 60_000, hasRecording: true, unreviewedCount: 1 }}
      selected={false}
      isToday={false}
      onClick={() => {}}
    />)

    expect(markup).toContain('>9<')
    expect(markup).toContain('>59分<')
    expect(markup).not.toContain('aria-hidden')
    expect(markup).not.toContain('>1</span>')
  })

  it('shows a stable speaker color dot beside the numeric speaker label', () => {
    type SpeakerLabelProps = {
      label: string
      colorIndex: number
      isBackground: boolean
    }
    const RecordingSpeakerLabel = (recordingSurface as unknown as {
      RecordingSpeakerLabel?: ComponentType<SpeakerLabelProps>
    }).RecordingSpeakerLabel

    expect(RecordingSpeakerLabel).toBeDefined()
    if (RecordingSpeakerLabel === undefined) return

    const markup = renderToStaticMarkup(<RecordingSpeakerLabel
      label="说话人 4"
      colorIndex={0}
      isBackground
    />)

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('background:#ec7fa9')
    expect(markup).toContain('>说话人 4<')
    expect(markup).toContain('>背景音<')
  })
})
