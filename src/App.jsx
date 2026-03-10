import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

function getOwnerRepo() {
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  const repo = pathParts[0] || ''
  const hostParts = window.location.hostname.split('.')
  const owner = hostParts[0] === 'localhost' ? '' : hostParts[0]
  return { owner, repo }
}

function extractTitleFromFile(fileName) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

function deckDisplayName(deck) {
  return deck.title || extractTitleFromFile(deck.fileName || deck.id)
}

function formatUploadedAt(value) {
  if (!value) {
    return 'Uploaded: unknown'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Uploaded: unknown'
  }

  return `Uploaded: ${date.toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })}`
}

function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed
}

function App() {
  const search = useMemo(() => new URLSearchParams(window.location.search), [])
  const isEmbedMode = search.get('embed') === '1'
  const initialPage = asPositiveInt(search.get('page'), 1)

  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [page, setPage] = useState(initialPage)
  const [sortBy, setSortBy] = useState('time_desc')
  const [searchText, setSearchText] = useState('')
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [slideViewportHeight, setSlideViewportHeight] = useState(420)
  const slideStageRef = useRef(null)

  const baseUrl = import.meta.env.BASE_URL
  const manifestUrl = `${baseUrl}decks/index.json`

  useEffect(() => {
    let active = true

    async function loadDecks() {
      setLoadingDecks(true)
      setError('')

      try {
        const response = await fetch(manifestUrl, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status}`)
        }

        const payload = await response.json()
        const list = Array.isArray(payload.decks) ? payload.decks : []
        const ordered = [...list].sort((a, b) => {
          const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
          const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
          return bt - at
        })
        if (!active) {
          return
        }

        setDecks(ordered)
        const deckParam = search.get('deck')
        const initialDeck = ordered.find((deck) => deck.id === deckParam) || ordered[0] || null
        setSelectedDeck(initialDeck)
      } catch {
        if (!active) {
          return
        }
        setError('Deck list could not be loaded. Ensure decks/index.json exists after deployment.')
      } finally {
        if (active) {
          setLoadingDecks(false)
        }
      }
    }

    loadDecks()

    return () => {
      active = false
    }
  }, [manifestUrl, search])

  useEffect(() => {
    setPage(1)
  }, [selectedDeck?.id])

  const pageCount = selectedDeck?.pageCount || selectedDeck?.pages?.length || 0
  const currentPage = Math.min(page, pageCount || page)

  const visibleDecks = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    let list = decks

    if (query) {
      list = list.filter((deck) => {
        const title = deckDisplayName(deck).toLowerCase()
        const fileName = (deck.fileName || '').toLowerCase()
        return title.includes(query) || fileName.includes(query)
      })
    }

    const sorted = [...list]
    if (sortBy === 'name_asc') {
      sorted.sort((a, b) => deckDisplayName(a).localeCompare(deckDisplayName(b), 'ja'))
    } else if (sortBy === 'name_desc') {
      sorted.sort((a, b) => deckDisplayName(b).localeCompare(deckDisplayName(a), 'ja'))
    } else if (sortBy === 'time_asc') {
      sorted.sort((a, b) => {
        const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
        const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
        return at - bt
      })
    } else {
      sorted.sort((a, b) => {
        const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
        const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
        return bt - at
      })
    }

    return sorted
  }, [decks, searchText, sortBy])

  useEffect(() => {
    if (selectedDeck && visibleDecks.some((deck) => deck.id === selectedDeck.id)) {
      return
    }
    setSelectedDeck(visibleDecks[0] || null)
  }, [selectedDeck, visibleDecks])

  const selectedPdfUrl = useMemo(() => {
    if (!selectedDeck) {
      return ''
    }
    return `${baseUrl}${selectedDeck.pdfPath}`
  }, [baseUrl, selectedDeck])

  const pageImageUrl = useMemo(() => {
    if (!selectedDeck || !Array.isArray(selectedDeck.pages) || selectedDeck.pages.length === 0) {
      return ''
    }

    const index = Math.max(0, Math.min(selectedDeck.pages.length - 1, currentPage - 1))
    return `${baseUrl}${selectedDeck.pages[index]}`
  }, [baseUrl, currentPage, selectedDeck])

  const sourceRepoUrl = useMemo(() => {
    if (!selectedDeck) {
      return ''
    }

    const { owner, repo } = getOwnerRepo()
    if (!owner || !repo || !selectedDeck.sourcePath) {
      return ''
    }

    return `https://github.com/${owner}/${repo}/blob/main/${selectedDeck.sourcePath}`
  }, [selectedDeck])

  const embedUrl = useMemo(() => {
    if (!selectedDeck) {
      return ''
    }

    const params = new URLSearchParams()
    params.set('deck', selectedDeck.id)
    params.set('embed', '1')
    params.set('page', String(currentPage))
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`
  }, [currentPage, selectedDeck])

  useEffect(() => {
    if (!selectedDeck) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    params.set('deck', selectedDeck.id)
    params.set('page', String(currentPage))
    if (isEmbedMode) {
      params.set('embed', '1')
    } else {
      params.delete('embed')
    }

    const nextQuery = params.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
    window.history.replaceState(null, '', nextUrl)
  }, [currentPage, isEmbedMode, selectedDeck])

  useEffect(() => {
    function updateSlideViewportHeight() {
      if (!slideStageRef.current) {
        return
      }

      const rect = slideStageRef.current.getBoundingClientRect()
      const viewportPadding = isEmbedMode ? 10 : 16
      const minHeight = isEmbedMode ? 96 : 120
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const availableHeight = Math.floor(viewportHeight - rect.top - viewportPadding)
      const nextHeight = Math.max(minHeight, availableHeight)

      setSlideViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    }

    const rafId = window.requestAnimationFrame(updateSlideViewportHeight)
    window.addEventListener('resize', updateSlideViewportHeight)
    window.visualViewport?.addEventListener('resize', updateSlideViewportHeight)

    const observer = new ResizeObserver(() => {
      updateSlideViewportHeight()
    })
    if (slideStageRef.current?.parentElement) {
      observer.observe(slideStageRef.current.parentElement)
    }

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateSlideViewportHeight)
      window.visualViewport?.removeEventListener('resize', updateSlideViewportHeight)
      observer.disconnect()
    }
  }, [error, isEmbedMode, loadingDecks, pageCount, selectedDeck?.id])

  async function copyEmbedCode() {
    if (!embedUrl) {
      return
    }

    const code = `<iframe src="${embedUrl}" width="960" height="540" style="border:0;" loading="lazy" allowfullscreen></iframe>`
    try {
      await navigator.clipboard.writeText(code)
      setNotice('埋め込みコードをコピーしました。')
    } catch {
      setNotice(code)
    }
  }

  function selectDeck(deck) {
    setSelectedDeck(deck)
    setError('')
    setNotice('')
  }

  const title = selectedDeck ? selectedDeck.title || extractTitleFromFile(selectedDeck.fileName || selectedDeck.id) : ''

  return (
    <div className={`page ${isEmbedMode ? 'embed' : ''}`}>
      {!isEmbedMode && (
        <header className="hero">
          <p className="badge">Self Hosted On GitHub Pages</p>
          <h1>SlideViewer on GitHub</h1>
          <p>PowerPointをGitHubに置くと、1枚ずつ表示できるスライドビューアとして公開します。</p>
        </header>
      )}

      <main className={`layout ${isEmbedMode ? 'embed-layout' : ''}`}>
        {!isEmbedMode && (
          <section className="panel list-panel">
            <h2>Deck Library</h2>
            <p className="hint">Source: repository <code>decks/</code> folder (root)</p>

            <div className="library-tools">
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by title or filename"
                aria-label="Search decks"
              />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort decks">
                <option value="time_desc">Time: Newest first</option>
                <option value="time_asc">Time: Oldest first</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>

            {loadingDecks && <p>Loading decks...</p>}
            {error && <p className="error">{error}</p>}
            {!loadingDecks && !error && decks.length === 0 && (
              <p className="hint">No decks found. Add .ppt or .pptx files under decks/ and push.</p>
            )}
            {!loadingDecks && !error && decks.length > 0 && visibleDecks.length === 0 && (
              <p className="hint">No decks matched your search.</p>
            )}

            <div className="deck-list">
              {visibleDecks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  className={`deck-item ${selectedDeck?.id === deck.id ? 'active' : ''}`}
                  onClick={() => selectDeck(deck)}
                >
                  <span>{deckDisplayName(deck)}</span>
                  <small>{deck.fileName}</small>
                  <small className="deck-time">{formatUploadedAt(deck.uploadedAt)}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="panel viewer-panel">
          <h2>{isEmbedMode ? 'Slide' : 'Viewer'}</h2>

          {!selectedDeck && !loadingDecks && !error && <p className="hint">Select a deck from the left.</p>}

          {selectedDeck && (
            <>
              {!isEmbedMode && (
                <div className="viewer-meta">
                  <h3>{title}</h3>
                  <p>{selectedDeck.fileName}</p>
                  <p>{formatUploadedAt(selectedDeck.uploadedAt)}</p>
                </div>
              )}

              <div className="slide-controls">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <p>
                  {currentPage} / {pageCount || '-'}
                </p>
                <button
                  type="button"
                  onClick={() => setPage((current) => (pageCount ? Math.min(pageCount, current + 1) : current + 1))}
                  disabled={pageCount > 0 && currentPage >= pageCount}
                >
                  Next
                </button>
              </div>

              {!isEmbedMode && (
                <div className="actions">
                  <a href={selectedPdfUrl} target="_blank" rel="noreferrer">
                    Open PDF in New Tab
                  </a>
                  <button type="button" className="secondary" onClick={copyEmbedCode}>
                    Copy Embed Code
                  </button>
                  {sourceRepoUrl && (
                    <a href={sourceRepoUrl} target="_blank" rel="noreferrer">
                      Open Source PPT in GitHub
                    </a>
                  )}
                </div>
              )}

              {!isEmbedMode && <p className="notice">Embed URL: <code>{embedUrl}</code></p>}
              {notice && <p className="notice">{notice}</p>}

              <div className="slide-stage" ref={slideStageRef} style={{ height: `${slideViewportHeight}px` }}>
                {pageImageUrl ? (
                  <img key={pageImageUrl} src={pageImageUrl} alt={`${title} page ${currentPage}`} className="viewer-image" />
                ) : (
                  <p className="hint">Slide image is not ready yet. Run deployment again.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
