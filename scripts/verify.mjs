import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
const files=['SKILL.md','references/tools.md','references/models.md','references/gotchas.md','references/workflows.md']
for(const file of files){const path=resolve('bragi-canvas',file),text=readFileSync(path,'utf8');assert.ok(text.trim().length>100);for(const match of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){if(!/^(https?:|app:|plugin:)/.test(match[1]))assert.ok(existsSync(resolve(dirname(path),match[1])),`Missing reference ${match[1]}`)}}
const skill=readFileSync('bragi-canvas/SKILL.md','utf8'),tools=readFileSync('bragi-canvas/references/tools.md','utf8')
assert.match(skill,/Current skill target: Bragi Canvas plugin \*\*\d+\.\d+\.\d+\*\*/)
for(const tool of tools.matchAll(/^### `([^`]+)`/gm))assert.ok(skill.includes('`'+tool[1]+'`'),`Missing tool ${tool[1]}`)
for(const state of ['waiting-canvas','polling','retrying','needs-attention','ready-to-apply'])assert.ok(tools.includes(state))
console.log('Skill version, references, tool index and recovery fields passed.')
