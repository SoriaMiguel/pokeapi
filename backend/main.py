from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

POKEAPI_URL = "https://pokeapi.co/api/v2/pokemon/{pokemon_id}"
POKEMON_COUNT = 151
MAX_CONCURRENT_REQUESTS = 20
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


class Pokemon(BaseModel):
    id: int
    name: str
    sprite: str
    fallback_sprite: str
    types: list[str]


app = FastAPI(title="Kanto Pokédex API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_pokemon_cache: tuple[Pokemon, ...] | None = None
_cache_lock = asyncio.Lock()


async def get_pokeapi_client() -> AsyncIterator[httpx.AsyncClient]:
    timeout = httpx.Timeout(20.0, connect=10.0)
    limits = httpx.Limits(max_connections=MAX_CONCURRENT_REQUESTS)
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        yield client


def _normalize_pokemon(payload: dict[str, Any]) -> Pokemon:
    fallback_sprite = payload["sprites"]["front_default"]
    artwork = payload["sprites"]["other"]["official-artwork"]["front_default"]
    sprite = artwork or fallback_sprite
    if not sprite or not fallback_sprite:
        raise ValueError(f"Pokémon {payload.get('id', 'unknown')} has no sprite")

    ordered_types = sorted(payload["types"], key=lambda item: item["slot"])
    return Pokemon(
        id=payload["id"],
        name=payload["name"],
        sprite=sprite,
        fallback_sprite=fallback_sprite,
        types=[item["type"]["name"] for item in ordered_types],
    )


async def _fetch_one(
    client: httpx.AsyncClient,
    pokemon_id: int,
    semaphore: asyncio.Semaphore,
) -> Pokemon:
    async with semaphore:
        response = await client.get(POKEAPI_URL.format(pokemon_id=pokemon_id))
        response.raise_for_status()
    return _normalize_pokemon(response.json())


async def _load_pokemon(client: httpx.AsyncClient) -> tuple[Pokemon, ...]:
    global _pokemon_cache

    if _pokemon_cache is not None:
        return _pokemon_cache

    async with _cache_lock:
        if _pokemon_cache is not None:
            return _pokemon_cache

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        pokemon = await asyncio.gather(
            *(
                _fetch_one(client, pokemon_id, semaphore)
                for pokemon_id in range(1, POKEMON_COUNT + 1)
            )
        )
        _pokemon_cache = tuple(sorted(pokemon, key=lambda item: item.id))
        return _pokemon_cache


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/api/pokemon", response_model=list[Pokemon])
async def list_pokemon(
    client: Annotated[httpx.AsyncClient, Depends(get_pokeapi_client)],
) -> tuple[Pokemon, ...]:
    try:
        return await _load_pokemon(client)
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="PokéAPI data is temporarily unavailable. Please try again.",
        ) from exc


if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
