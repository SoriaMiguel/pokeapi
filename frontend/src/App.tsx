import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleDot, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { fetchPokemon } from './api'
import { PokemonCard } from './components/PokemonCard'
import type { Pokemon } from './types'



function App() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeRequest = useRef<AbortController | null>(null)
  const typeOptions = useMemo(() => ['all', ...Array.from(new Set(pokemon.flatMap((entry) => entry.types))).sort()], [pokemon])

  const loadPokemon = () => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setIsLoading(true)
    setError(null)
    fetchPokemon(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPokemon(data)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'Something went wrong while loading the Pokédex.')
      })
      .finally(() => {
        if (activeRequest.current === controller) {
          activeRequest.current = null
          setIsLoading(false)
        }
      })
  }

  useEffect(() => {
    loadPokemon()
    return () => {
      activeRequest.current?.abort()
      activeRequest.current = null
    }
  }, [])

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return pokemon.filter((entry) => {
      const matchesName = !normalizedQuery || entry.name.toLowerCase().includes(normalizedQuery)
      const matchesType = selectedType === 'all' || entry.types.includes(selectedType)
      return matchesName && matchesType
    })
  }, [pokemon, query, selectedType])

  const clearFilters = () => {
    setQuery('')
    setSelectedType('all')
  }

  const hasFilters = query.length > 0 || selectedType !== 'all'

  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb--one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--two" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="/" aria-label="Kanto Index home">
          <span className="brand__symbol"><CircleDot size={21} strokeWidth={2.4} /></span>
          <span className="brand__name">KANTO<span>INDEX</span></span>
        </a>
        <div className="header-meta">
          <span className="status-dot" />
          <span>LIVE DATA / GEN I</span>
          <span className="header-meta__count">001—151</span>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="kicker"><span /> NATIONAL DEX / 01</p>
            <h1>The original<br /><em>151.</em></h1>
            <p className="hero-description">A curated field guide to the first generation of Pokémon. Search the archive, trace a type, and find your next favorite.</p>
          </div>
          <div className="hero-badge" aria-label="Pokédex generation one">
            <span className="hero-badge__ring" />
            <span className="hero-badge__number">01</span>
            <span className="hero-badge__label">GENERATION<br />ONE</span>
          </div>
        </section>

        <section className="control-panel" aria-label="Pokémon filters">
          <div className="control-panel__search">
            <Search size={19} strokeWidth={1.7} aria-hidden="true" />
            <label className="sr-only" htmlFor="pokemon-search">Search Pokémon by name</label>
            <input
              id="pokemon-search"
              type="search"
              value={query}
              placeholder="Search by name..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <button className="clear-search" type="button" onClick={() => setQuery('')} aria-label="Clear name search"><X size={16} /></button>}
          </div>
          <div className="control-panel__divider" />
          <div className="type-filter">
            <SlidersHorizontal size={18} strokeWidth={1.7} aria-hidden="true" />
            <label htmlFor="type-filter">TYPE</label>
            <select id="type-filter" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {typeOptions.map((type) => <option value={type} key={type}>{type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
            </select>
          </div>
          {hasFilters && <button className="reset-button" type="button" onClick={clearFilters}><RotateCcw size={15} /> Reset</button>}
        </section>

        <div className="results-heading">
          <div>
            <p className="section-label">ARCHIVE / SPECIMENS</p>
            <h2>{hasFilters ? 'Filtered field notes' : 'The Kanto archive'}</h2>
          </div>
          <p className="result-count"><strong>{filteredPokemon.length.toString().padStart(3, '0')}</strong> / {pokemon.length || 151} FOUND</p>
        </div>

        {isLoading && (
          <div className="state-panel" role="status">
            <div className="loader" />
            <p>Indexing the Kanto archive...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="state-panel state-panel--error" role="alert">
            <CircleAlert size={28} />
            <h2>Archive unavailable</h2>
            <p>{error}</p>
            <button className="primary-button" type="button" onClick={() => loadPokemon()}><RotateCcw size={16} /> Try again</button>
          </div>
        )}

        {!isLoading && !error && filteredPokemon.length > 0 && (
          <section className="pokemon-grid" aria-live="polite" aria-label="Pokémon results">
            {filteredPokemon.map((entry) => <PokemonCard pokemon={entry} key={entry.id} />)}
          </section>
        )}

        {!isLoading && !error && filteredPokemon.length === 0 && (
          <div className="state-panel" role="status">
            <span className="empty-mark">∅</span>
            <h2>No specimens found</h2>
            <p>Try a different name or clear the type filter to reopen the archive.</p>
            <button className="primary-button" type="button" onClick={clearFilters}>Show all Pokémon</button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <span>BUILT WITH POKÉAPI</span>
        <span className="site-footer__line" />
        <span>KANTO / 1996—2026</span>
      </footer>
    </div>
  )
}

export default App
