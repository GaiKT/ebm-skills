#!/usr/bin/env node
import { cp, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ALL_SKILLS = ['ebm-init', 'ebm-auth', 'ebm-table', 'ebm-form', 'ebm-upload', 'ebm-thai']

const onlyIndex = process.argv.indexOf('--only')
const selectedNames = onlyIndex !== -1
  ? process.argv[onlyIndex + 1].split(',').map(s => s.trim().replace(/^ebm-/, ''))
  : null

const skills = selectedNames
  ? selectedNames.map(s => `ebm-${s}`).filter(s => ALL_SKILLS.includes(s))
  : ALL_SKILLS

const claudeSkillsDir = join(homedir(), '.claude', 'skills')
const packageSkillsDir = join(__dirname, '..', 'skills')

// Verify Claude Code is installed
try {
  await access(join(homedir(), '.claude'))
} catch {
  console.error('❌ ~/.claude not found — is Claude Code installed?')
  console.error('   Download at: https://claude.ai/download')
  process.exit(1)
}

console.log('Installing ebm-skills for Claude Code...\n')

const installed = []
const failed = []

for (const skill of skills) {
  const src = join(packageSkillsDir, skill)
  const dest = join(claudeSkillsDir, skill)
  try {
    await mkdir(dest, { recursive: true })
    await cp(src, dest, { recursive: true })
    console.log(`  ✓ /${skill}`)
    installed.push(skill)
  } catch (err) {
    console.error(`  ✗ ${skill}: ${err.message}`)
    failed.push(skill)
  }
}

console.log(`\n${installed.length} skill(s) installed to ~/.claude/skills/\n`)

if (failed.length > 0) {
  console.error(`Failed: ${failed.join(', ')}\n`)
}

console.log('Available in Claude Code:')
installed.forEach(s => console.log(`  /${s}`))
console.log('\nRestart Claude Code to activate.')
