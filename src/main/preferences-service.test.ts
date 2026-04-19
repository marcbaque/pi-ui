// @vitest-environment node
// src/main/preferences-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PreferencesService } from './preferences-service'

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockMkdir = vi.fn()

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

// Electron's app.getPath is only available in the main process.
// We inject the userData path via the constructor for testability.
describe('PreferencesService', () => {
  let service: PreferencesService

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
    service = new PreferencesService('/fake/userData')
  })

  describe('get', () => {
    it('returns stored preferences', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ lastUsedDirectory: '/home/user/code' }))

      const prefs = await service.get()

      expect(prefs.lastUsedDirectory).toBe('/home/user/code')
    })

    it('returns null lastUsedDirectory when file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const prefs = await service.get()

      expect(prefs.lastUsedDirectory).toBeNull()
    })
  })

  describe('set', () => {
    it('merges patch and writes to userData/preferences.json', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ lastUsedDirectory: '/old/path' }))

      await service.set({ lastUsedDirectory: '/new/path' })

      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(written.lastUsedDirectory).toBe('/new/path')
      expect(mockWriteFile.mock.calls[0][0]).toBe('/fake/userData/preferences.json')
    })
  })
})
