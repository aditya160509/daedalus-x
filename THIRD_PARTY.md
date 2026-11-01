# Third-party code

Daedalus X is AGPL-3.0-or-later. Bundled third-party code keeps its own licence and copyright.

| Component | Source | Licence | Where |
|---|---|---|---|
| Chili3D v0.8.0 (commit e35a8ee) | https://github.com/xiangechen/chili3d | AGPL-3.0 | `apps/cockpit/public/cad` (built; Microsoft Clarity tracking removed) |

Rebuild Chili3D: `git clone https://github.com/xiangechen/chili3d vendor/chili3d && cd vendor/chili3d && npm ci && npm run build`, then copy `dist/` to `apps/cockpit/public/cad` and strip the Clarity script from `index.html`.
