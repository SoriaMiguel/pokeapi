import type { Pokemon } from './types'

export async function fetchPokemon(signal?: AbortSignal): Promise<Pokemon[]> {
  const response = await fetch('/api/pokemon', { signal })
  if (!response.ok) {
    let detail = 'The PokéAPI connection could not be reached.'
    try {
      const body = (await response.json()) as { detail?: string }
      detail = body.detail ?? detail
    } catch {
      // Keep the useful default when the server does not return JSON.
    }
    throw new Error(detail)
  }

  return (await response.json()) as Pokemon[]
}
