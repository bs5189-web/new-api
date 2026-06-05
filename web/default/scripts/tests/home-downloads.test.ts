import assert from 'node:assert/strict'
import { describe, test } from 'bun:test'
import { RUIZHI_DOWNLOADS } from '../../src/features/home/downloads'

describe('Ruizhi downloads', () => {
  test('provides the three supported installer variants', () => {
    assert.deepEqual(
      RUIZHI_DOWNLOADS.map((download) => download.id),
      ['windows-x86', 'macos-x64', 'macos-arm64']
    )
  })

  test('uses stable public download paths and installer file names', () => {
    assert.deepEqual(
      RUIZHI_DOWNLOADS.map((download) => download.href),
      [
        '/downloads/ruizhi/ruizhi-windows-x86.exe',
        '/downloads/ruizhi/ruizhi-macos-x64.dmg',
        '/downloads/ruizhi/ruizhi-macos-arm64.dmg',
      ]
    )
  })
})
