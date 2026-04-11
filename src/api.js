const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function parseJson(response) {
  let payload
  let text = ''

  try {
    text = await response.text()
  } catch (err) {
    console.error('Failed to read response:', err)
    throw new Error(`Network error: ${err.message}`)
  }

  if (!text || !text.trim()) {
    console.error('Empty response from backend. Status:', response.status, 'Headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    })
    throw new Error(
      `Backend returned empty response. Is backend running on http://localhost:5000? Status: ${response.status}`,
    )
  }

  try {
    payload = JSON.parse(text)
  } catch (err) {
    console.error('JSON parse failed. First 200 chars of response:', text.substring(0, 200))
    throw new Error(`Invalid JSON: ${err.message}. Response: ${text.substring(0, 100)}`)
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed with status ${response.status}`)
  }
  return payload
}

export async function uploadFile(file) {
  const body = new FormData()
  body.append('file', file)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body,
  })
  return parseJson(response)
}

export async function fetchFiles() {
  const response = await fetch(`${API_BASE}/files`)
  return parseJson(response)
}

export async function fetchFileDetails(fileId) {
  const response = await fetch(`${API_BASE}/files/${fileId}`)
  return parseJson(response)
}

export async function runSearch(fileId, query, type) {
  const params = new URLSearchParams({
    file_id: fileId,
    query,
    type,
  })
  const response = await fetch(`${API_BASE}/search?${params.toString()}`)
  return parseJson(response)
}

export async function runAnalytics(fileId, word, left, right) {
  const params = new URLSearchParams({
    file_id: fileId,
    word,
    l: String(left),
    r: String(right),
  })
  const response = await fetch(`${API_BASE}/analytics?${params.toString()}`)
  return parseJson(response)
}

export async function updateLine(fileId, lineNumber, newContent) {
  const response = await fetch(`${API_BASE}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
      line_number: lineNumber,
      new_content: newContent,
    }),
  })
  return parseJson(response)
}
