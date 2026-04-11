import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'data', 'files')
const META_FILE = path.join(DATA_DIR, 'index.json')

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(META_FILE)
  } catch {
    await fs.writeFile(META_FILE, JSON.stringify({ files: {} }, null, 2), 'utf8')
  }
}

async function readMeta() {
  await ensureStore()
  const raw = await fs.readFile(META_FILE, 'utf8')
  return JSON.parse(raw)
}

async function writeMeta(meta) {
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8')
}

function splitLines(content) {
  return content.replace(/\r\n/g, '\n').split('\n')
}

export async function createStoredFile(originalName, content) {
  const meta = await readMeta()
  const fileId = randomUUID()
  const filePath = path.join(DATA_DIR, `${fileId}.txt`)
  const now = new Date().toISOString()

  await fs.writeFile(filePath, content, 'utf8')

  meta.files[fileId] = {
    file_id: fileId,
    original_name: originalName,
    file_path: filePath,
    created_at: now,
    updated_at: now,
    line_count: splitLines(content).length,
  }

  await writeMeta(meta)
  return meta.files[fileId]
}

export async function getFileById(fileId) {
  const meta = await readMeta()
  return meta.files[fileId] || null
}

export async function listFiles() {
  const meta = await readMeta()
  return Object.values(meta.files)
}

export async function readFileLines(fileId) {
  const file = await getFileById(fileId)
  if (!file) {
    return null
  }

  const content = await fs.readFile(file.file_path, 'utf8')
  const lines = splitLines(content)
  return {
    ...file,
    lines,
  }
}

export async function updateStoredLine(fileId, lineNumber, newContent) {
  const meta = await readMeta()
  const file = meta.files[fileId]
  if (!file) {
    return null
  }

  const content = await fs.readFile(file.file_path, 'utf8')
  const lines = splitLines(content)
  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error('line_number out of range')
  }

  lines[lineNumber - 1] = newContent
  await fs.writeFile(file.file_path, lines.join('\n'), 'utf8')

  file.updated_at = new Date().toISOString()
  file.line_count = lines.length
  await writeMeta(meta)

  return {
    ...file,
    lines,
  }
}
