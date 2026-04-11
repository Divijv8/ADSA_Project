import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'

import {
  createStoredFile,
  getFileById,
  listFiles,
  readFileLines,
  updateStoredLine,
} from './fileStore.js'
import {
  analyticsRange,
  healthcheck,
  searchPrefix,
  searchSubstring,
  updateLine,
} from './engineService.js'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    fieldSize: 50 * 1024 * 1024,
  },
})

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = function (data) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> response sent`)
    return originalJson(data)
  }
  next()
})

app.get('/health', async (_req, res) => {
  try {
    const engine = await healthcheck()
    res.json({ ok: true, backend: 'up', engine })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('[UPLOAD] Starting upload, file name:', req.file?.originalname)
    if (!req.file) {
      console.log('[UPLOAD] No file in request')
      return res.status(400).json({ ok: false, error: 'No file uploaded' })
    }

    if (req.file.size === 0) {
      console.log('[UPLOAD] Empty file rejected')
      return res.status(400).json({ ok: false, error: 'File is empty' })
    }

    console.log('[UPLOAD] File size:', req.file.size, 'bytes')
    const content = req.file.buffer.toString('utf8')
    console.log('[UPLOAD] Content decoded, length:', content.length)

    if (!content || content.trim().length === 0) {
      console.log('[UPLOAD] File decoded but is empty')
      return res.status(400).json({ ok: false, error: 'File content is empty after decoding' })
    }

    const file = await createStoredFile(req.file.originalname, content)
    console.log('[UPLOAD] File stored successfully, ID:', file.file_id)

    const response = { ok: true, file_id: file.file_id, file }
    console.log('[UPLOAD] Sending success response')
    return res.json(response)
  } catch (error) {
    console.error('[UPLOAD] Error:', error.message, error.stack)
    return res.status(500).json({
      ok: false,
      error: `Upload failed: ${error.message}`,
    })
  }
})

app.get('/files', async (_req, res) => {
  try {
    const files = await listFiles()
    res.json({ ok: true, files })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/files/:fileId', async (req, res) => {
  try {
    const data = await readFileLines(req.params.fileId)
    if (!data) {
      return res.status(404).json({ ok: false, error: 'File not found' })
    }

    return res.json({ ok: true, ...data })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/search', async (req, res) => {
  try {
    const { query = '', type = 'prefix', file_id: fileId } = req.query

    if (!fileId) {
      return res.status(400).json({ ok: false, error: 'file_id is required' })
    }

    const file = await getFileById(fileId)
    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not found' })
    }

    let result
    if (type === 'prefix') {
      result = await searchPrefix(String(query), file.file_path)
    } else if (type === 'substring') {
      result = await searchSubstring(String(query), file.file_path)
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid type. Use prefix or substring' })
    }

    return res.json({ ok: true, file_id: fileId, query, type, ...result })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/analytics', async (req, res) => {
  try {
    const { word = '', l = '1', r = '1', file_id: fileId } = req.query

    if (!fileId) {
      return res.status(400).json({ ok: false, error: 'file_id is required' })
    }

    const file = await getFileById(fileId)
    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not found' })
    }

    const left = Number.parseInt(String(l), 10)
    const right = Number.parseInt(String(r), 10)
    const result = await analyticsRange(String(word), left, right, file.file_path)
    return res.json({ ok: true, file_id: fileId, ...result })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/update', async (req, res) => {
  try {
    const { file_id: fileId, line_number: lineNumber, new_content: newContent } = req.body

    if (!fileId || !lineNumber || typeof newContent !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'file_id, line_number and new_content are required',
      })
    }

    const file = await getFileById(fileId)
    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not found' })
    }

    await updateStoredLine(fileId, Number(lineNumber), newContent)
    const result = await updateLine(Number(lineNumber), newContent, file.file_path)

    return res.json({
      ok: true,
      file_id: fileId,
      status: result.status || 'updated',
      line_number: Number(lineNumber),
      reindex: result.reindex || 'partial_reindex_applied',
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`)
  console.log(`CORS: enabled | Proxy target for frontend dev server`)
  console.log(`Data directory: ${path.resolve(path.join(process.cwd(), 'data', 'files'))}`)
})
