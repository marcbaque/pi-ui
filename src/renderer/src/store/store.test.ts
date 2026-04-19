// src/renderer/src/store/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'

function getStore() {
  return useStore.getState()
}

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

const MOCK_TAB = {
  id: 'tab-1',
  sessionId: 'tab-1',
  cwd: '/code',
  model: 'claude',
  provider: 'anthropic',
  thinkingLevel: 'low' as const,
  status: 'idle' as const,
  messages: [],
  currentStreamingContent: '',
  mode: 'active' as const,
}

describe('tabs slice', () => {
  beforeEach(resetStore)

  it('starts with no tabs and no activeTabId', () => {
    expect(getStore().tabs.tabs).toEqual([])
    expect(getStore().tabs.activeTabId).toBeNull()
  })

  it('createTab adds a tab and sets it as active', () => {
    getStore().createTab(MOCK_TAB)
    expect(getStore().tabs.tabs).toHaveLength(1)
    expect(getStore().tabs.activeTabId).toBe('tab-1')
  })

  it('closeTab removes the tab and activates the nearest remaining (prefer left)', () => {
    getStore().createTab(MOCK_TAB)
    getStore().createTab({ ...MOCK_TAB, id: 'tab-2', sessionId: 'tab-2' })
    getStore().createTab({ ...MOCK_TAB, id: 'tab-3', sessionId: 'tab-3' })
    // tab-3 is now active. close tab-3 → should activate tab-2 (left neighbor)
    getStore().closeTab('tab-3')
    expect(getStore().tabs.tabs).toHaveLength(2)
    expect(getStore().tabs.activeTabId).toBe('tab-2')
  })

  it('closeTab with last tab sets activeTabId to null', () => {
    getStore().createTab(MOCK_TAB)
    getStore().closeTab('tab-1')
    expect(getStore().tabs.tabs).toHaveLength(0)
    expect(getStore().tabs.activeTabId).toBeNull()
  })

  it('appendToken appends delta to the correct tab currentStreamingContent', () => {
    getStore().createTab(MOCK_TAB)
    getStore().appendToken('tab-1', 'Hello')
    getStore().appendToken('tab-1', ' world')
    expect(getStore().tabs.tabs[0].currentStreamingContent).toBe('Hello world')
  })

  it('addUserMessage pushes a user message to the correct tab', () => {
    getStore().createTab(MOCK_TAB)
    getStore().addUserMessage('tab-1', 'fix the bug')
    expect(getStore().tabs.tabs[0].messages).toHaveLength(1)
    expect(getStore().tabs.tabs[0].messages[0].role).toBe('user')
    expect(getStore().tabs.tabs[0].messages[0].content).toBe('fix the bug')
  })

  it('finalizeAssistantMessage moves streaming content into a message and clears buffer', () => {
    getStore().createTab(MOCK_TAB)
    getStore().appendToken('tab-1', 'Sure!')
    getStore().finalizeAssistantMessage('tab-1')
    expect(getStore().tabs.tabs[0].messages).toHaveLength(1)
    expect(getStore().tabs.tabs[0].messages[0].role).toBe('assistant')
    expect(getStore().tabs.tabs[0].messages[0].content).toBe('Sure!')
    expect(getStore().tabs.tabs[0].currentStreamingContent).toBe('')
  })

  it('addToolCall adds a pending tool call to the latest message in the correct tab', () => {
    getStore().createTab(MOCK_TAB)
    getStore().addUserMessage('tab-1', 'read the file')
    getStore().appendToken('tab-1', 'Reading...')
    getStore().finalizeAssistantMessage('tab-1')
    getStore().addToolCall('tab-1', {
      toolCallId: 't1',
      toolName: 'read',
      args: { path: 'foo.ts' },
    })
    const lastMsg = getStore().tabs.tabs[0].messages[1]
    expect(lastMsg.toolCalls).toHaveLength(1)
    expect(lastMsg.toolCalls[0].status).toBe('pending')
  })

  it('resolveToolCall updates the matching tool call to done in the correct tab', () => {
    getStore().createTab(MOCK_TAB)
    getStore().appendToken('tab-1', 'ok')
    getStore().finalizeAssistantMessage('tab-1')
    getStore().addToolCall('tab-1', { toolCallId: 't1', toolName: 'read', args: {} })
    getStore().resolveToolCall('tab-1', {
      toolCallId: 't1',
      result: 'file contents',
      isError: false,
      durationMs: 42,
    })
    const tool = getStore().tabs.tabs[0].messages[0].toolCalls[0]
    expect(tool.status).toBe('done')
    expect(tool.result).toBe('file contents')
    expect(tool.durationMs).toBe(42)
  })

  it('setTabStatus updates the status of the correct tab', () => {
    getStore().createTab(MOCK_TAB)
    getStore().setTabStatus('tab-1', 'thinking')
    expect(getStore().tabs.tabs[0].status).toBe('thinking')
  })

  it('replaceTab replaces the tab and sets it as active', () => {
    getStore().createTab(MOCK_TAB)
    const newTab = { ...MOCK_TAB, id: 'tab-new', sessionId: 'tab-new', cwd: '/new' }
    getStore().replaceTab('tab-1', newTab)
    expect(getStore().tabs.tabs[0].id).toBe('tab-new')
    expect(getStore().tabs.activeTabId).toBe('tab-new')
  })
})

describe('config slice', () => {
  beforeEach(resetStore)

  it('starts with empty config', () => {
    expect(getStore().config.providers).toEqual([])
    expect(getStore().config.models).toEqual([])
  })

  it('setConfig replaces the full config', () => {
    getStore().setConfig({
      providers: [{ name: 'anthropic', authType: 'apikey', configured: true }],
      defaultModel: 'claude',
      defaultProvider: 'anthropic',
      defaultThinkingLevel: 'low',
      systemPrompt: '',
      homedir: '/Users/test',
      defaultWorkingDirectory: null,
    })
    expect(getStore().config.providers).toHaveLength(1)
    expect(getStore().config.defaultModel).toBe('claude')
  })

  it('setModels replaces the model list', () => {
    getStore().setModels([
      { provider: 'anthropic', modelId: 'claude', displayName: 'Claude', supportsThinking: true },
    ])
    expect(getStore().config.models).toHaveLength(1)
  })
})

describe('history slice', () => {
  beforeEach(resetStore)

  it('starts with empty sessions and no expanded cwds', () => {
    expect(getStore().history.sessions).toEqual([])
    expect(getStore().history.expandedCwds).toEqual([])
  })

  it('setSessions replaces the session list', () => {
    getStore().setSessions([
      {
        id: 'abc',
        path: '/home/.pi/sessions/--code--/session.jsonl',
        cwd: '/code',
        cwdSlug: '--code--',
        lastActiveAt: 0,
        model: null,
        pinned: false,
        tags: [],
        name: null,
        isActive: false,
      },
    ])
    expect(getStore().history.sessions).toHaveLength(1)
    expect(getStore().history.sessions[0].id).toBe('abc')
  })

  it('toggleCwdExpanded adds a cwd slug when not present', () => {
    getStore().toggleCwdExpanded('--code--')
    expect(getStore().history.expandedCwds).toContain('--code--')
  })

  it('toggleCwdExpanded removes a cwd slug when already present', () => {
    getStore().toggleCwdExpanded('--code--')
    getStore().toggleCwdExpanded('--code--')
    expect(getStore().history.expandedCwds).not.toContain('--code--')
  })
})

describe('ui slice', () => {
  beforeEach(resetStore)

  it('starts with all modals closed', () => {
    expect(getStore().ui.settingsOpen).toBe(false)
    expect(getStore().ui.newSessionOpen).toBe(false)
  })

  it('openSettings sets settingsOpen to true', () => {
    getStore().openSettings()
    expect(getStore().ui.settingsOpen).toBe(true)
  })

  it('closeSettings sets settingsOpen to false', () => {
    getStore().openSettings()
    getStore().closeSettings()
    expect(getStore().ui.settingsOpen).toBe(false)
  })

  it('openNewSession sets newSessionOpen to true', () => {
    getStore().openNewSession()
    expect(getStore().ui.newSessionOpen).toBe(true)
  })
})
