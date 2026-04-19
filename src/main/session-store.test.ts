import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionStore, type FsLike } from './session-store'

vi.mock('@mariozechner/pi-coding-agent', () => ({
  SessionManager: {
    listAll: vi.fn(),
    open: vi.fn(),
  },
  createAgentSession: vi.fn(),
  DefaultResourceLoader: vi.fn(),
}))

import { SessionManager } from '@mariozechner/pi-coding-agent'

const mockFs = {
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}

describe('SessionStore', () => {
  let store: SessionStore

  beforeEach(() => {
    store = new SessionStore(mockFs as FsLike)
    vi.clearAllMocks()
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockReturnValue('{}')
    mockFs.writeFileSync.mockReset()
    mockFs.mkdirSync.mockReset()
  })

  it('list() returns empty array when no sessions exist', async () => {
    vi.mocked(SessionManager.listAll).mockResolvedValue([])
    const result = await store.list([])
    expect(result).toEqual([])
  })

  it('list() maps SessionInfo to SessionSummary', async () => {
    vi.mocked(SessionManager.listAll).mockResolvedValue([
      {
        path: '/home/.pi/agent/sessions/--home-code--/2024-01-01T00-00-00-000Z_abc.jsonl',
        id: 'abc',
        cwd: '/home/code',
        name: undefined,
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-02'),
        messageCount: 3,
        firstMessage: 'hello',
        allMessagesText: 'hello world',
      },
    ])

    const result = await store.list([])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('abc')
    expect(result[0].cwd).toBe('/home/code')
    expect(result[0].lastActiveAt).toBe(new Date('2024-01-02').getTime())
    expect(result[0].pinned).toBe(false)
    expect(result[0].tags).toEqual([])
    expect(result[0].isActive).toBe(false)
  })

  it('list() marks isActive when sessionId matches active session', async () => {
    vi.mocked(SessionManager.listAll).mockResolvedValue([
      {
        path: '/home/.pi/agent/sessions/--home--/2024-01-01T00-00-00-000Z_abc.jsonl',
        id: 'abc',
        cwd: '/home',
        name: undefined,
        created: new Date(),
        modified: new Date(),
        messageCount: 1,
        firstMessage: '',
        allMessagesText: '',
      },
    ])

    const result = await store.list(['abc'])
    expect(result[0].isActive).toBe(true)
  })

  it('list() applies pinned from .meta.json', async () => {
    vi.mocked(SessionManager.listAll).mockResolvedValue([
      {
        path: '/home/.pi/agent/sessions/--home--/2024-01-01T00-00-00-000Z_abc.jsonl',
        id: 'abc',
        cwd: '/home',
        name: undefined,
        created: new Date(),
        modified: new Date(),
        messageCount: 1,
        firstMessage: '',
        allMessagesText: '',
      },
    ])
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ abc: { tags: ['important'], pinned: true } })
    )

    const result = await store.list([])
    expect(result[0].pinned).toBe(true)
    expect(result[0].tags).toEqual(['important'])
  })

  it('updateMeta() writes updated meta to .meta.json', async () => {
    const written: string[] = []
    mockFs.writeFileSync.mockImplementation((_p: unknown, data: unknown) => {
      written.push(data as string)
    })

    await store.updateMeta('/home/.pi/agent/sessions/--home--', 'abc', {
      pinned: true,
      tags: ['foo'],
    })

    expect(written).toHaveLength(1)
    const parsed = JSON.parse(written[0])
    expect(parsed.abc.pinned).toBe(true)
    expect(parsed.abc.tags).toEqual(['foo'])
  })
})
