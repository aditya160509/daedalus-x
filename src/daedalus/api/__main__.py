"""Run the API: `uv run daedalus-api` (binds to localhost only)."""

import uvicorn


def main() -> None:
    uvicorn.run("daedalus.api:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
