from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from backend import main


def payload(pokemon_id: int, *, types: list[tuple[int, str]] | None = None) -> dict[str, Any]:
    return {
        "id": pokemon_id,
        "name": f"pokemon-{pokemon_id}",
        "types": [
            {"slot": slot, "type": {"name": name}}
            for slot, name in (types or [(1, "normal")])
        ],
        "sprites": {
            "front_default": f"https://img.test/{pokemon_id}.png",
            "other": {
                "official-artwork": {
                    "front_default": f"https://art.test/{pokemon_id}.png",
                }
            },
        },
    }


@pytest.fixture(autouse=True)
def reset_cache() -> Iterator[None]:
    main._pokemon_cache = None
    yield
    main._pokemon_cache = None


def mock_transport(counter: dict[str, int], *, fail_id: int | None = None) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        pokemon_id = int(request.url.path.rsplit("/", 1)[-1])
        counter["calls"] += 1
        if pokemon_id == fail_id:
            return httpx.Response(500, request=request)
        types = [(2, "flying"), (1, "water")] if pokemon_id == 1 else None
        return httpx.Response(200, json=payload(pokemon_id, types=types), request=request)

    return httpx.MockTransport(handler)


def client_with_transport(transport: httpx.AsyncBaseTransport) -> TestClient:
    async def override_client() -> Any:
        async with httpx.AsyncClient(transport=transport) as client:
            yield client

    main.app.dependency_overrides[main.get_pokeapi_client] = override_client
    return TestClient(main.app)


def test_pokemon_route_normalizes_orders_and_caches() -> None:
    counter = {"calls": 0}
    client = client_with_transport(mock_transport(counter))

    first = client.get("/api/pokemon")
    second = client.get("/api/pokemon")

    assert first.status_code == 200
    assert len(first.json()) == 151
    assert first.json()[0] == {
        "id": 1,
        "name": "pokemon-1",
        "sprite": "https://art.test/1.png",
        "fallback_sprite": "https://img.test/1.png",
        "types": ["water", "flying"],
    }
    assert first.json()[-1]["id"] == 151
    assert second.json() == first.json()
    assert counter["calls"] == 151

    main.app.dependency_overrides.clear()
    client.close()


def test_pokemon_route_does_not_cache_partial_upstream_data() -> None:
    counter = {"calls": 0}
    client = client_with_transport(mock_transport(counter, fail_id=77))

    response = client.get("/api/pokemon")

    assert response.status_code == 503
    assert response.json()["detail"] == "PokéAPI data is temporarily unavailable. Please try again."
    assert main._pokemon_cache is None

    main.app.dependency_overrides.clear()
    client.close()
