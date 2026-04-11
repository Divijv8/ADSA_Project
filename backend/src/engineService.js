import { spawn } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const engineBinaryName = process.platform === 'win32' ? 'engine.exe' : 'engine'
const enginePath = path.join(root, 'core', engineBinaryName)

function parseJsonOutput(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`Invalid engine output: ${raw}`)
  }
}

function runEngine(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(enginePath, args)

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to start engine: ${err.message}`))
    })

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Engine exited with code ${code}: ${stderr}`))
        return
      }

      const parsed = parseJsonOutput(stdout.trim())
      if (parsed.ok === false) {
        reject(new Error(parsed.error || 'Engine command failed'))
        return
      }

      resolve(parsed)
    })
  })
}

export function searchPrefix(query, filePath) {
  return runEngine(['search', 'prefix', query, filePath])
}

export function searchSubstring(query, filePath) {
  return runEngine(['search', 'substring', query, filePath])
}

export function analyticsRange(word, left, right, filePath) {
  return runEngine(['analytics', word, String(left), String(right), filePath])
}

export function updateLine(lineNumber, newContent, filePath) {
  return runEngine(['update', String(lineNumber), newContent, filePath])
}

export function healthcheck() {
  return runEngine(['health'])
}
