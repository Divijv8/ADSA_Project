import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchFileDetails,
  fetchFiles,
  runAnalytics,
  runSearch,
  updateLine,
  uploadFile,
} from './api'
import './App.css'

function App() {
  const [files, setFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState('')
  const [fileData, setFileData] = useState(null)
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('prefix')
  const [searchResults, setSearchResults] = useState([])
  const [analyticsWord, setAnalyticsWord] = useState('')
  const [analyticsRange, setAnalyticsRange] = useState({ l: 1, r: 1 })
  const [analyticsResult, setAnalyticsResult] = useState(null)
  const [updateForm, setUpdateForm] = useState({ line: 1, content: '' })
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState('')

  const selectedFile = useMemo(
    () => files.find((f) => f.file_id === selectedFileId) || null,
    [files, selectedFileId],
  )

  const loadFiles = useCallback(async () => {
    try {
      setStatus('Loading files...')
      const payload = await fetchFiles()
      setFiles(payload.files || [])
      setStatus('Files loaded')
      if (!selectedFileId && payload.files?.length > 0) {
        setSelectedFileId(payload.files[0].file_id)
      }
    } catch (loadError) {
      console.error('Failed to load files:', loadError)
      setError(`Failed to load files: ${loadError.message}`)
      setStatus('Failed to load files - check console')
    }
  }, [selectedFileId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  useEffect(() => {
    if (!selectedFileId) {
      setFileData(null)
      return
    }

    ;(async () => {
      try {
        const payload = await fetchFileDetails(selectedFileId)
        setFileData(payload)
        setAnalyticsRange({
          l: 1,
          r: payload.lines?.length || 1,
        })
      } catch (detailError) {
        setError(detailError.message)
      }
    })()
  }, [selectedFileId])

  useEffect(() => {
    if (!selectedFileId || !query.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const payload = await runSearch(selectedFileId, query, searchType)
        setSearchResults(payload.matches || [])
      } catch (searchError) {
        setError(searchError.message)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [selectedFileId, query, searchType])

  async function handleUpload(file) {
    if (!file) {
      return
    }

    setUploading(true)
    setError('')
    setStatus('Uploading and indexing file...')

    try {
      const payload = await uploadFile(file)
      setStatus(`Indexed ${payload.file.original_name}`)
      await loadFiles()
      setSelectedFileId(payload.file_id)
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAnalytics(event) {
    event.preventDefault()
    if (!selectedFileId || !analyticsWord.trim()) {
      return
    }

    setError('')
    try {
      const payload = await runAnalytics(
        selectedFileId,
        analyticsWord,
        analyticsRange.l,
        analyticsRange.r,
      )
      setAnalyticsResult(payload)
    } catch (analyticsError) {
      setError(analyticsError.message)
    }
  }

  async function handleUpdateLine(event) {
    event.preventDefault()
    if (!selectedFileId || !updateForm.content.trim()) {
      return
    }

    setError('')
    try {
      await updateLine(selectedFileId, Number(updateForm.line), updateForm.content)
      const payload = await fetchFileDetails(selectedFileId)
      setFileData(payload)
      setStatus(`Line ${updateForm.line} updated and re-indexed`)
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const highlightedLines = useMemo(() => {
    if (!fileData?.lines) {
      return []
    }
    if (!query.trim()) {
      return fileData.lines.map((line) => ({ line, parts: [line] }))
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'ig')
    return fileData.lines.map((line) => ({
      line,
      parts: line.split(regex),
    }))
  }, [fileData?.lines, query])

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Smart Code Search & Analytics Engine</p>
        <h1>Upload. Index. Search. Analyze.</h1>
        <p className="subhead">
          Trie-powered prefix autocomplete, suffix-array substring matching, and
          segment-tree range analytics with efficient update re-indexing.
        </p>
      </header>

      <section className="dashboard-grid">
        <article className="card upload-card">
          <h2>File Management</h2>
          <label
            className={`dropzone ${uploading ? 'busy' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleUpload(e.dataTransfer.files?.[0])
            }}
          >
            <input
              type="file"
              accept=".txt,.md,.cpp,.js,.py,.java,.json,.csv"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            <span>{uploading ? 'Indexing file...' : 'Drag & drop or click to upload'}</span>
          </label>

          <label className="field">
            <span>Active file</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
            >
              <option value="">Select file</option>
              {files.map((file) => (
                <option key={file.file_id} value={file.file_id}>
                  {file.original_name}
                </option>
              ))}
            </select>
          </label>

          <p className="status">{status}</p>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card search-card">
          <h2>Search Engine</h2>
          <div className="search-controls">
            <label className="field">
              <span>Query</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing..."
              />
            </label>

            <label className="field">
              <span>Type</span>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="prefix">Prefix (Trie)</option>
                <option value="substring">Substring (Suffix Array)</option>
              </select>
            </label>
          </div>

          <ul className="results-list">
            {searchResults.length === 0 ? <li>No matches yet.</li> : null}
            {searchResults.map((item, idx) => (
              <li key={`${idx}-${item.word || item.line_number}`}>
                {searchType === 'prefix' ? (
                  <>
                    <strong>{item.word}</strong>
                    <span>frequency: {item.frequency}</span>
                  </>
                ) : (
                  <>
                    <strong>line {item.line_number}</strong>
                    <span>{item.preview}</span>
                    <span>
                      hits: {item.hits} | score: {Number(item.score).toFixed(2)}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="card analytics-card">
          <h2>Range Analytics</h2>
          <form className="analytics-form" onSubmit={handleAnalytics}>
            <label className="field">
              <span>Word</span>
              <input
                value={analyticsWord}
                onChange={(e) => setAnalyticsWord(e.target.value)}
                placeholder="token"
              />
            </label>

            <label className="field">
              <span>Range start</span>
              <input
                type="number"
                min="1"
                value={analyticsRange.l}
                onChange={(e) =>
                  setAnalyticsRange((prev) => ({ ...prev, l: Number(e.target.value) }))
                }
              />
            </label>

            <label className="field">
              <span>Range end</span>
              <input
                type="number"
                min="1"
                value={analyticsRange.r}
                onChange={(e) =>
                  setAnalyticsRange((prev) => ({ ...prev, r: Number(e.target.value) }))
                }
              />
            </label>

            <button type="submit">Run Query</button>
          </form>

          {analyticsResult ? (
            <div className="analytics-result">
              <p>
                Frequency of <strong>{analyticsResult.word}</strong> in lines{' '}
                {analyticsResult.range?.[0]} - {analyticsResult.range?.[1]}:
              </p>
              <h3>{analyticsResult.frequency}</h3>
            </div>
          ) : null}
        </article>

        <article className="card viewer-card">
          <h2>File Viewer</h2>
          <p className="meta">
            {selectedFile
              ? `${selectedFile.original_name} (${fileData?.lines?.length || 0} lines)`
              : 'No file selected'}
          </p>
          <div className="viewer">
            {highlightedLines.map((entry, idx) => (
              <div className="line" key={`line-${idx}`}>
                <span className="line-no">{idx + 1}</span>
                <span className="line-text">
                  {entry.parts.map((part, partIdx) => {
                    const shouldMark =
                      query.trim() && part.toLowerCase() === query.trim().toLowerCase()
                    return shouldMark ? (
                      <mark key={`part-${partIdx}`}>{part}</mark>
                    ) : (
                      <span key={`part-${partIdx}`}>{part}</span>
                    )
                  })}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="card update-card">
          <h2>Update + Re-index</h2>
          <form className="analytics-form" onSubmit={handleUpdateLine}>
            <label className="field">
              <span>Line number</span>
              <input
                type="number"
                min="1"
                value={updateForm.line}
                onChange={(e) =>
                  setUpdateForm((prev) => ({
                    ...prev,
                    line: Number(e.target.value),
                  }))
                }
              />
            </label>

            <label className="field">
              <span>New content</span>
              <textarea
                rows="4"
                value={updateForm.content}
                onChange={(e) =>
                  setUpdateForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
              />
            </label>

            <button type="submit">Update Line</button>
          </form>
        </article>
      </section>
    </main>
  )
}

export default App
