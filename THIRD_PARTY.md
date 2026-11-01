# Third-party code

Daedalus X is AGPL-3.0-or-later. Bundled third-party code keeps its own licence and copyright.

| Component | Source | Licence | Where |
|---|---|---|---|
| Chili3D v0.8.0 (commit e35a8ee) | https://github.com/xiangechen/chili3d | AGPL-3.0 | `apps/cockpit/public/cad` (built; Microsoft Clarity tracking removed) |

Rebuild Chili3D: clone it into `vendor/chili3d` at the commit above, `git apply ../../patches/chili3d.patch` (our changes: no branding, no AI assistant or API key, no tracking, opens straight into a design, dark theme), `npm ci && npm run build && node scripts/build-plugins.mjs`, then copy `dist/` to `apps/cockpit/public/cad`.
