import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { Pokemon } from '../types'

type PokemonCardProps = {
  pokemon: Pokemon
}

const typeLabels: Record<string, string> = {
  bug: 'Bug',
  dark: 'Dark',
  dragon: 'Dragon',
  electric: 'Electric',
  fairy: 'Fairy',
  fighting: 'Fighting',
  fire: 'Fire',
  flying: 'Flying',
  ghost: 'Ghost',
  grass: 'Grass',
  ground: 'Ground',
  ice: 'Ice',
  normal: 'Normal',
  poison: 'Poison',
  psychic: 'Psychic',
  rock: 'Rock',
  steel: 'Steel',
  water: 'Water',
}

export function PokemonCard({ pokemon }: PokemonCardProps) {
  const [imageSource, setImageSource] = useState(pokemon.sprite)

  return (
    <article className="pokemon-card">
      <div className="pokemon-card__topline">
        <span className="pokemon-card__number">#{String(pokemon.id).padStart(3, '0')}</span>
        <span className="pokemon-card__mark" aria-hidden="true">↗</span>
      </div>
      <div className="pokemon-card__visual">
        <div className="pokemon-card__glow" aria-hidden="true" />
        <img
          src={imageSource}
          alt={`${pokemon.name} sprite`}
          loading="lazy"
          onError={() => {
            if (imageSource !== pokemon.fallback_sprite) setImageSource(pokemon.fallback_sprite)
          }}
        />
      </div>
      <div className="pokemon-card__footer">
        <div>
          <p className="pokemon-card__eyebrow">KANTO SPECIMEN</p>
          <h2>{pokemon.name}</h2>
        </div>
        <ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="pokemon-card__types" aria-label={`${pokemon.name} types`}>
        {pokemon.types.map((type) => (
          <span className={`type-pill type-pill--${type}`} key={type}>
            {typeLabels[type] ?? type}
          </span>
        ))}
      </div>
    </article>
  )
}
