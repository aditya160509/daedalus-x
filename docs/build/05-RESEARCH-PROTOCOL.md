# Research protocol (TinyFish)

Research before building anything visual or algorithmic. Use the **TinyFish MCP** tools: they're free and token-efficient.

1. `mcp__tinyfish__search`: find 3–6 sources. Prefer official docs (openfoam.com, docs.pyvista.org, drei.docs.pmnd.rs, botorch.org, ax.dev, typst.app), then vendor galleries (Siemens, Ansys, Luminary, Motion Applied), then papers.
2. `mcp__tinyfish__fetch_content`: read the 1–3 best. Set `image_links: true` on gallery pages to get image URLs to use as visual references.
3. Record what you used in `docs/build/references/<TASK-ID>.md`:
   ```
   ## <topic>
   - <title>: <url>. What I took from it (1 line).
   ### Visual references
   - <image url>: trait to match (e.g. "streamlines thin, 60% alpha, coloured by speed, black background").
   ```
4. Cite the reference file in your evidence note.

Rules:
- Never paste copyrighted text or code longer than a few lines. Summarise, then implement it yourself.
- Never hotlink images into the app. References are for humans and models only.
- Verify API names against the docs of the **installed** version (check `uv pip show` and `package.json`).
- If research contradicts a task file, follow the research, then note the deviation.
