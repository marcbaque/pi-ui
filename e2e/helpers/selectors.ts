// e2e/helpers/selectors.ts
// Centralised selector helpers. Uses data-testid attributes for stability.

import type { Page } from '@playwright/test'

export const sidebar = {
  root: (page: Page) => page.locator('[data-testid="sidebar"]'),
  newSessionBtn: (page: Page) => page.locator('[data-testid="new-session-btn"]').first(),
  modelList: (page: Page) => page.locator('[data-testid="model-list"]'),
  modelItem: (page: Page, modelId: string) =>
    page.locator(`[data-testid="model-item-${modelId}"]`),
  providerList: (page: Page) => page.locator('[data-testid="provider-list"]'),
  providerItem: (page: Page, name: string) =>
    page.locator(`[data-testid="provider-item-${name.toLowerCase()}"]`),
  settingsBtn: (page: Page) => page.locator('[data-testid="settings-btn"]'),
}

export const chat = {
  emptyState: (page: Page) => page.locator('[data-testid="chat-empty-state"]'),
  messageList: (page: Page) => page.locator('[data-testid="message-list"]'),
  userMessage: (page: Page, index = 0) =>
    page.locator('[data-testid="user-message"]').nth(index),
  assistantMessage: (page: Page, index = 0) =>
    page.locator('[data-testid="assistant-message"]').nth(index),
  toolCallEntry: (page: Page, index = 0) =>
    page.locator('[data-testid="tool-call-entry"]').nth(index),
  input: (page: Page) => page.locator('[data-testid="chat-input"]'),
  sendBtn: (page: Page) => page.locator('[data-testid="send-btn"]'),
  stopBtn: (page: Page) => page.locator('[data-testid="stop-btn"]'),
  statusDot: (page: Page) => page.locator('[data-testid="status-dot"]'),
  statusText: (page: Page) => page.locator('[data-testid="status-text"]'),
  toolbar: (page: Page) => page.locator('[data-testid="chat-toolbar"]'),
}

export const newSessionDialog = {
  root: (page: Page) => page.locator('[data-testid="new-session-dialog"]'),
  cwdInput: (page: Page) => page.locator('[data-testid="cwd-input"]'),
  modelSelect: (page: Page) => page.locator('[data-testid="model-select"]'),
  thinkingControl: (page: Page) => page.locator('[data-testid="thinking-control"]'),
  startBtn: (page: Page) => page.locator('[data-testid="start-session-btn"]'),
  cancelBtn: (page: Page) => page.locator('[data-testid="cancel-session-btn"]'),
}

export const settingsModal = {
  root: (page: Page) => page.locator('[data-testid="settings-modal"]'),
  apiKeyInput: (page: Page, provider: string) =>
    page.locator(`[data-testid="api-key-input-${provider.toLowerCase()}"]`),
  saveApiKeyBtn: (page: Page, provider: string) =>
    page.locator(`[data-testid="save-api-key-btn-${provider.toLowerCase()}"]`),
  defaultModelSelect: (page: Page) => page.locator('[data-testid="default-model-select"]'),
  systemPromptInput: (page: Page) => page.locator('[data-testid="system-prompt-input"]'),
}
