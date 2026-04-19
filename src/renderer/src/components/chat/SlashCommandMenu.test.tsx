// src/renderer/src/components/chat/SlashCommandMenu.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SlashCommandMenu from './SlashCommandMenu'
import type { SlashCommand } from '@shared/types'

const COMMANDS: SlashCommand[] = [
  { name: 'compact', description: 'Compress context', source: 'builtin', insertText: '/compact' },
  { name: 'name', description: 'Set session name', source: 'builtin', insertText: '/name ' },
  {
    name: 'skill:brainstorming',
    description: 'Brainstorm ideas',
    source: 'skill',
    insertText: '/skill:brainstorming',
  },
]

describe('SlashCommandMenu', () => {
  it('renders all commands', () => {
    render(
      <SlashCommandMenu
        commands={COMMANDS}
        activeIndex={0}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('compact')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('skill:brainstorming')).toBeInTheDocument()
  })

  it('highlights the active item', () => {
    render(
      <SlashCommandMenu
        commands={COMMANDS}
        activeIndex={1}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    const items = screen.getAllByRole('option')
    expect(items[1]).toHaveAttribute('aria-selected', 'true')
    expect(items[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with the right command on mouseDown', () => {
    const onSelect = vi.fn()
    render(
      <SlashCommandMenu
        commands={COMMANDS}
        activeIndex={0}
        onSelect={onSelect}
        onDismiss={vi.fn()}
      />
    )
    fireEvent.mouseDown(screen.getAllByRole('option')[2])
    expect(onSelect).toHaveBeenCalledWith(COMMANDS[2])
  })

  it('renders source badges', () => {
    render(
      <SlashCommandMenu
        commands={COMMANDS}
        activeIndex={0}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getAllByText('builtin').length).toBeGreaterThan(0)
    expect(screen.getByText('skill')).toBeInTheDocument()
  })

  it('renders empty state when commands list is empty', () => {
    render(
      <SlashCommandMenu commands={[]} activeIndex={0} onSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/no commands/i)).toBeInTheDocument()
  })
})
