// src/renderer/src/store/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'

function getStore() {
  return useStore.getState()
}

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('session slice', () => {
  beforeEach(resetStore)

  it('starts with no active session', () => {
    expect(getStore().session.active).toBe(false)
    expect(getStore().session.messages).toEqual([])
  })

  it('setSessionActive marks session as active with given props', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    expect(getStore().session.active).toBe(true)
    expect(getStore().session.sessionId).toBe('abc')
    expect(getStore().session.status).toBe('idle')
  })

  it('appendToken appends delta to currentStreamingContent', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().appendToken('Hello')
    getStore().appendToken(' world')
    expect(getStore().session.currentStreamingContent).toBe('Hello world')
  })

  it('addUserMessage pushes a user message and clears streaming content', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().addUserMessage('fix the bug')
    expect(getStore().session.messages).toHaveLength(1)
    expect(getStore().session.messages[0].role).toBe('user')
    expect(getStore().session.messages[0].content).toBe('fix the bug')
  })

  it('finalizeAssistantMessage moves streaming content into a message and clears buffer', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().appendToken('Sure!')
    getStore().finalizeAssistantMessage()
    expect(getStore().session.messages).toHaveLength(1)
    expect(getStore().session.messages[0].role).toBe('assistant')
    expect(getStore().session.messages[0].content).toBe('Sure!')
    expect(getStore().session.currentStreamingContent).toBe('')
  })

  it('addToolCall adds a pending tool call to the latest assistant message', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().addUserMessage('read the file')
    getStore().appendToken('Reading...')
    getStore().finalizeAssistantMessage()
    getStore().addToolCall({ toolCallId: 't1', toolName: 'read', args: { path: 'foo.ts' } })
    const lastMsg = getStore().session.messages[1]
    expect(lastMsg.toolCalls).toHaveLength(1)
    expect(lastMsg.toolCalls[0].status).toBe('pending')
  })

  it('resolveToolCall updates the matching tool call to done', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().appendToken('ok')
    getStore().finalizeAssistantMessage()
    getStore().addToolCall({ toolCallId: 't1', toolName: 'read', args: {} })
    getStore().resolveToolCall({
      toolCallId: 't1',
      result: 'file contents',
      isError: false,
      durationMs: 42,
    })
    const tool = getStore().session.messages[0].toolCalls[0]
    expect(tool.status).toBe('done')
    expect(tool.result).toBe('file contents')
    expect(tool.durationMs).toBe(42)
  })

  it('setSessionStatus updates the status', () => {
    getStore().setSessionActive({
      sessionId: 'abc',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
    getStore().setSessionStatus('thinking')
    expect(getStore().session.status).toBe('thinking')
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
