import fs from 'node:fs';
import path from 'node:path';

export type SkillId = 'crypto' | 'equity' | 'portfolio';

const SKILL_DIR = path.join(process.cwd(), 'src', 'lib', 'agent-skills');

const cache = new Map<SkillId, string>();

export function loadSkill(id: SkillId): string {
  const cached = cache.get(id);
  if (cached) return cached;

  const file = path.join(SKILL_DIR, id, 'SKILL.md');
  const raw = fs.readFileSync(file, 'utf8');

  // Strip optional YAML frontmatter — we feed the body to Claude as the system prompt.
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
  cache.set(id, body);
  return body;
}

export const SKILL_LABEL: Record<SkillId, string> = {
  crypto: 'Crypto Analyst',
  equity: 'Equity Research',
  portfolio: 'Portfolio Manager',
};
