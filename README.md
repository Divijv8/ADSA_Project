# Smart Code Search & Analytics Engine

Full-stack system for code/text indexing and search powered by advanced data structures:

- Trie for prefix autocomplete
- Suffix Array for substring pattern matching
- Segment Tree for range frequency analytics

## Architecture

React (frontend)
-> Express API (backend)
-> C++ executable (core engine)
-> file storage and indexing layer

## Project Layout

```
ADSA_Project/
	src/                   # React frontend
	backend/src/           # Express API and engine bridge
	core/                  # C++ engine + data structure implementations
		engine.cpp
		trie.cpp
		suffix_array.cpp
		segment_tree.cpp
	data/files/            # Stored uploaded files + metadata index
	temp_io/               # Reserved for optional temp IPC files
```

## C++ Engine Commands

```
./engine search prefix <query> <file_path>
./engine search substring <query> <file_path>
./engine analytics <word> <l> <r> <file_path>
./engine update <line_number> <new_content> <file_path>
```

All responses are JSON-compatible via stdout.

## API Endpoints

- `POST /upload`
	- multipart file field: `file`
	- returns `file_id`
- `GET /search?file_id=...&query=...&type=prefix|substring`
- `GET /analytics?file_id=...&word=...&l=1&r=20`
- `POST /update`
	- JSON body: `{ file_id, line_number, new_content }`
- `GET /files`
- `GET /files/:fileId`
- `GET /health`

## Setup

1. Install JavaScript dependencies:

```bash
npm install
```

2. Build the C++ core:

```bash
npm run build:engine
```

3. Run frontend + backend together:

```bash
npm run dev:full
```

Frontend runs at `http://localhost:5173` and backend at `http://localhost:5000`.

## Frontend Features

- Drag-and-drop upload
- Debounced live search
- Prefix / substring mode switch
- Line-numbered viewer with query highlighting
- Range analytics panel
- Line update + re-index action
- Ranked search results

## Performance Notes

- Prefix lookup: $O(L)$ traversal on the trie
- Substring lookup: binary search over suffix array, roughly $O(m \log n)$
- Segment tree query/update: $O(\log n)$

## Known Tradeoff

The standalone executable is stateless between invocations, so the backend controls persisted files while the engine rebuilds in-memory structures per command for correctness and modularity.

---

## Troubleshooting

### "Empty response from http://localhost:5173/api/files"

**Symptoms:** File list won't load, shows "Failed to load files" error or "Empty response" in console.

**Root Causes & Solutions:**

1. **Backend is not running:**
   ```bash
   # Terminal 2: Start backend
   npm run dev:backend
   ```
   - Backend MUST be running on http://localhost:5000
   - Check terminal for: `Backend API listening on http://localhost:5000`

2. **Frontend port changed (5173 → 5174+ if port in use):**
   - If 5173 is occupied, Vite auto-increments to 5174, 5175, etc.
   - **Use the actual port shown in your terminal**
   - Frontend proxy routes `/api/*` requests to backend:5000
   - Both must be running for the app to work

3. **Proxy not routing correctly:**
   - Clear Vite dev cache and restart:
     ```bash
     # Kill both servers (Ctrl+C)
     rm -r node_modules/.vite  
     npm run dev:full
     ```

4. **Direct connectivity test:**
   ```bash
   # Test backend directly
   Invoke-WebRequest http://localhost:5000/files -UseBasicParsing
   
   # Test through frontend proxy
   Invoke-WebRequest http://localhost:5174/api/files -UseBasicParsing
   ```

5. **Wait for both servers to fully start:**
   - After `npm run dev:frontend`, wait 1-2 seconds
   - After `npm run dev:backend`, wait 1-2 seconds
   - Refresh browser if it loads too early

**Quick Diagnostic:**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for error message details
4. Check **Network** tab to see if `/api/files` request is being sent
5. Share error details if stuck

### "Unexpected end of JSON input" during file upload

**Symptoms:** Upload button shows "Uploading and indexing file..." but then error appears.

**Solutions:**

1. **Verify both servers are running:**
   ```bash
   # Terminal 1: Frontend
   npm run dev:frontend
   
   # Terminal 2: Backend  
   npm run dev:backend
   ```
   - Frontend should be on http://localhost:5173 (or 5174+ if ports taken)
   - Backend should be on http://localhost:5000

2. **Check backend logs for upload errors:**
   - Look for `[UPLOAD]` messages in backend terminal
   - Verify `data/files/` directory exists and is writable
   - Check `data/files/index.json` is not corrupted

3. **Use Browser DevTools to debug:**
   - Press F12 → Network tab
   - Perform an upload
   - Click `/api/upload` request
   - Check **Response** tab for actual JSON error (not HTML)
   - Check **Console** tab for any parse errors

4. **Verify file compatibility:**
   - Use text-based files only (.txt, .md, .cpp, .js, .py, .java, .json, .csv)
   - Binary files will cause parsing errors
   - Maximum file size: 50MB

5. **Full reset if stuck:**
   ```bash
   # Stop both servers (Ctrl+C)
   # Clear uploaded files
   rm data/files/*.txt
   # Restart both servers
   npm run dev:frontend
   npm run dev:backend
   # Try uploading again
   ```

### "Port X is already in use" error

```bash
# Find and kill process using the port
netstat -ano | findstr :5000  # or :5173 for frontend
taskkill /PID <PID> /F

# Then restart
npm run dev:backend
```

### C++ engine not found / "engine" is not recognized

```bash
npm run build:engine
```

This compiles the C++ search engine from source. Requires g++ compiler.

### Large file upload fails

- Maximum file size is **50MB**
- Split larger files into chunks
- Use gzip compression for text before uploading if needed

### Search returns no results

1. Confirm file was indexed: check file appears in file list
2. Try simple prefix search (e.g., type "a" or "the")
3. Verify file contains text in UTF-8 format
4. Check backend logs for engine errors

### Search is very slow

- For very large files (>10MB), first search will be slower as engine builds indices
- Subsequent searches on same file are cached in-memory by React component
- Try substring search if prefix search is slow (suffix array can be faster for patterns)

---

## Development

### Running All Services Together

```bash
npm run dev:full
```

This runs frontend (5173/5174) + backend (5000) concurrently.

### Building for Production

```bash
npm run build        # Frontend
npm run build:engine # C++ (if needed)
```

Output: `dist/` folder contains production-ready React bundle.

### Folder Structure

- `src/` — React UI components + CSS
- `backend/src/` — Express server + file storage + engine bridge
- `core/` — C++ source + compiled `engine` binary
- `data/files/` — Uploaded files + `index.json` metadata
- `public/` — Static assets

### API Response Format

All endpoints return JSON with `ok` field:

```json
{
  "ok": true,
  "data": {...}
}
```

Or on error:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```
