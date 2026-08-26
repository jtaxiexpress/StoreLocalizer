// Slash commands for the Agent chat input.
//
// A message starting with "/" never reaches the model: it is handled locally
// and answered with a `note` message in the transcript. Commands mostly drive
// the write-approval permissions (always-allow list, auto-approve mode).

import { AGENT_TOOL_LIST, WRITE_TOOL_NAMES } from '@/services/agentTools'

export const AGENT_COMMANDS = [
  {
    name: '/allow',
    usage: '/allow <tool|all>',
    description: 'Always allow a write tool — it runs without asking again',
  },
  {
    name: '/ask',
    usage: '/ask <tool|all>',
    description: 'Ask for approval again for a tool (undo /allow)',
  },
  {
    name: '/auto',
    usage: '/auto <on|off>',
    description: 'Auto-approve every write, including tools you never allowed',
  },
  {
    name: '/permissions',
    usage: '/permissions',
    description: 'Show which write tools currently run without approval',
  },
  {
    name: '/tools',
    usage: '/tools [filter]',
    description: 'List the tools the model can call',
  },
  {
    name: '/clear',
    usage: '/clear',
    description: 'Clear the conversation',
  },
  {
    name: '/help',
    usage: '/help',
    description: 'Show the available commands',
  },
]

export function isCommand(text) {
  return typeof text === 'string' && text.trimStart().startsWith('/')
}

/** Commands matching what the user has typed so far (for the input suggestions). */
export function matchCommands(text) {
  if (!isCommand(text)) return []
  const trimmed = text.trimStart()
  // Once the command name is complete and followed by a space, stop suggesting
  if (/\s/.test(trimmed)) {
    const [name] = trimmed.split(/\s+/)
    return AGENT_COMMANDS.filter((c) => c.name === name)
  }
  return AGENT_COMMANDS.filter((c) => c.name.startsWith(trimmed.toLowerCase()))
}

function formatToolList(names) {
  return names.map((n) => `- \`${n}\``).join('\n')
}

function permissionsSummary({ autoApprove, alwaysAllow }) {
  if (autoApprove) {
    return '**Auto-approve is ON** — every write runs immediately, without asking.\n\nTurn it off with `/auto off`.'
  }
  const allowed = [...alwaysAllow].filter((n) => WRITE_TOOL_NAMES.has(n)).sort()
  if (!allowed.length) {
    return 'Every write action asks for your approval. Use `/allow <tool>` (or the **Always allow** button on an approval) to skip the prompt for a tool.'
  }
  return `These write tools run without asking:\n\n${formatToolList(allowed)}\n\nRevoke with \`/ask <tool>\` or \`/ask all\`.`
}

/**
 * Execute a slash command.
 *
 * @param {string} text raw input
 * @param {object} ctx  { autoApprove, alwaysAllow: Set, setAutoApprove, allowTools, askTools, clearConversation }
 * @returns {{ note: string, tone?: 'error' }}
 */
export function runCommand(text, ctx) {
  const trimmed = text.trim()
  const [rawName, ...rest] = trimmed.split(/\s+/)
  const name = rawName.toLowerCase()
  const arg = rest.join(' ').trim()
  const command = AGENT_COMMANDS.find((c) => c.name === name)

  if (!command) {
    return {
      note: `Unknown command \`${rawName}\`. Type \`/help\` to see what's available.`,
      tone: 'error',
    }
  }

  switch (name) {
    case '/help':
      return {
        note: `**Commands**\n\n${AGENT_COMMANDS.map((c) => `- \`${c.usage}\` — ${c.description}`).join('\n')}`,
      }

    case '/permissions':
      return { note: permissionsSummary(ctx) }

    case '/allow': {
      if (!arg) return { note: 'Usage: `/allow <tool|all>` — see `/permissions` and `/tools`.', tone: 'error' }
      if (arg === 'all') {
        ctx.allowTools([...WRITE_TOOL_NAMES])
        return { note: `All ${WRITE_TOOL_NAMES.size} write tools are now always allowed. Revoke with \`/ask all\`.` }
      }
      const names = arg.split(/[\s,]+/).filter(Boolean)
      const unknown = names.filter((n) => !WRITE_TOOL_NAMES.has(n))
      if (unknown.length) {
        return {
          note: `Not a write tool: ${unknown.map((n) => `\`${n}\``).join(', ')}. Write tools are:\n\n${formatToolList([...WRITE_TOOL_NAMES].sort())}`,
          tone: 'error',
        }
      }
      ctx.allowTools(names)
      return { note: `Always allowed: ${names.map((n) => `\`${n}\``).join(', ')}. Revoke with \`/ask ${names[0]}\`.` }
    }

    case '/ask': {
      if (!arg || arg === 'all') {
        ctx.askTools(null)
        return { note: 'Every write action asks for your approval again.' }
      }
      const names = arg.split(/[\s,]+/).filter(Boolean)
      ctx.askTools(names)
      return { note: `Approval required again for: ${names.map((n) => `\`${n}\``).join(', ')}.` }
    }

    case '/auto': {
      const value = arg.toLowerCase()
      if (value !== 'on' && value !== 'off') {
        return { note: `Usage: \`/auto <on|off>\` — auto-approve is currently **${ctx.autoApprove ? 'on' : 'off'}**.`, tone: 'error' }
      }
      ctx.setAutoApprove(value === 'on')
      return {
        note: value === 'on'
          ? '⚠️ Auto-approve is **on** — writes to App Store Connect and Google Play run without asking.'
          : 'Auto-approve is **off** — writes ask for your approval again.',
      }
    }

    case '/tools': {
      const filter = arg.toLowerCase()
      const list = AGENT_TOOL_LIST.filter(
        (t) => !filter || t.name.includes(filter) || t.description.toLowerCase().includes(filter)
      )
      if (!list.length) return { note: `No tool matches \`${arg}\`.`, tone: 'error' }
      const rows = list
        .map((t) => `- \`${t.name}\`${t.write ? ' **(write)**' : ''} — ${t.description.split('.')[0]}`)
        .join('\n')
      return { note: `**${list.length} tool${list.length > 1 ? 's' : ''}**\n\n${rows}` }
    }

    case '/clear':
      ctx.clearConversation()
      return null // the conversation (including this note) is gone

    default:
      return { note: `\`${name}\` isn't handled yet.`, tone: 'error' }
  }
}
