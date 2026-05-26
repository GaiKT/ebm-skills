#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ALL_SKILLS = ['ebm-init', 'ebm-auth', 'ebm-table', 'ebm-form', 'ebm-upload', 'ebm-thai']
const packageSkillsDir = join(__dirname, '..', 'skills')

const onlyIndex = process.argv.indexOf('--only')
const selectedNames = onlyIndex !== -1
  ? process.argv[onlyIndex + 1].split(',').map(s => s.trim().replace(/^ebm-/, ''))
  : null
const skills = selectedNames
  ? selectedNames.map(s => `ebm-${s}`).filter(s => ALL_SKILLS.includes(s))
  : ALL_SKILLS

async function pathExists(p) {
  try { await access(p); return true } catch { return false }
}

async function convertToCursorMdc(skillDir) {
  const skillMd = await readFile(join(skillDir, 'SKILL.md'), 'utf8')
  const m = skillMd.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/m)
  if (!m) return skillMd
  const descMatch = m[1].match(/description:\s*(.+)/)
  const description = descMatch ? descMatch[1].trim() : ''
  return `---\ndescription: ${description}\nalwaysApply: false\n---\n${m[2]}`
}

// Read all stdin lines upfront (supports both interactive TTY and piped input)
async function readStdinLines() {
  if (process.stdin.isTTY) return null // interactive — use per-question readline
  return new Promise(resolve => {
    const chunks = []
    process.stdin.on('data', d => chunks.push(d))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString().split(/\r?\n/).map(l => l.trim())))
  })
}

async function makeAsker(lines) {
  if (lines) {
    // piped mode — pop lines from queue
    let i = 0
    return (q) => {
      const ans = lines[i++] ?? ''
      process.stdout.write(q + ans + '\n')
      return Promise.resolve(ans)
    }
  }
  // interactive mode — readline
  const { createInterface } = await import('readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise(resolve => rl.question(q, ans => resolve(ans.trim())))
  ask.close = () => rl.close()
  return ask
}

async function main() {
  const lines = await readStdinLines()
  const ask = await makeAsker(lines)

  console.log('\nebm-skills installer\n')
  console.log('Which platforms? (enter numbers separated by comma)\n')
  console.log('  1) Claude Code   (~/.claude/skills/)')
  console.log('  2) Antigravity   (~/.gemini/antigravity/skills/)')
  console.log('  3) Cursor        (.cursor/rules/ or ~/.cursor/rules/)')
  console.log()

  const platformInput = await ask('Platforms [1,2,3]: ')
  const selected = platformInput.split(',').map(s => s.trim()).filter(s => ['1','2','3'].includes(s))

  if (selected.length === 0) {
    ask.close?.()
    console.error('No platform selected. Exiting.')
    process.exit(1)
  }

  const targets = []

  if (selected.includes('1')) {
    const claudeDir = join(homedir(), '.claude')
    if (!(await pathExists(claudeDir))) {
      console.warn('⚠  ~/.claude not found — skipping Claude Code')
    } else {
      targets.push({ name: 'Claude Code', dest: join(claudeDir, 'skills'), type: 'claude' })
    }
  }

  if (selected.includes('2')) {
    targets.push({
      name: 'Antigravity',
      dest: join(homedir(), '.gemini', 'antigravity', 'skills'),
      type: 'antigravity'
    })
  }

  if (selected.includes('3')) {
    const scope = await ask('Cursor scope — (g)lobal ~/.cursor/rules/ or (w)orkspace .cursor/rules/? [g/w]: ')
    const isWorkspace = scope.toLowerCase().startsWith('w')
    const dest = isWorkspace
      ? join(process.cwd(), '.cursor', 'rules')
      : join(homedir(), '.cursor', 'rules')
    targets.push({ name: `Cursor (${isWorkspace ? 'workspace' : 'global'})`, dest, type: 'cursor' })
  }

  ask.close?.()

  if (targets.length === 0) {
    console.error('No valid targets. Exiting.')
    process.exit(1)
  }

  console.log()

  for (const target of targets) {
    console.log(`Installing to ${target.name}...`)
    const installed = []
    const failed = []

    for (const skill of skills) {
      const src = join(packageSkillsDir, skill)
      try {
        if (target.type === 'cursor') {
          await mkdir(target.dest, { recursive: true })
          const mdc = await convertToCursorMdc(src)
          await writeFile(join(target.dest, `${skill}.mdc`), mdc, 'utf8')
        } else {
          const dest = join(target.dest, skill)
          await mkdir(dest, { recursive: true })
          await cp(src, dest, { recursive: true })
        }
        console.log(`  ✓ /${skill}`)
        installed.push(skill)
      } catch (err) {
        console.error(`  ✗ ${skill}: ${err.message}`)
        failed.push(skill)
      }
    }

    console.log(`  → ${installed.length} skill(s) installed to ${target.dest}\n`)
    if (failed.length > 0) console.error(`  Failed: ${failed.join(', ')}\n`)
  }

  console.log('Done! Restart your editor to activate the skills.')
  console.log(`\nAvailable commands: ${skills.map(s => `/${s}`).join('  ')}`)
}

main().catch(err => { console.error(err); process.exit(1) })
