# Replay rebuild references

Licences checked with gh api before using source, 2026-11-02.

- [pmndrs/racing-game](https://github.com/pmndrs/racing-game/tree/7816a5d954b75e6ad853ae4e4f0cbbd628072643), MIT: App.tsx lighting/environment setup and effects/Cameras.tsx camera modes. Adapted to a small straight track and telemetry-driven positions. Its vehicle physics/assets are not used.
- [slowlydev/f1-dash](https://github.com/slowlydev/f1-dash/tree/d21607afbbab44a97863a605bad174d3c92367f2), AGPL-3.0: DriverMiniSectors status colours adapted directly, with explicit completion states and a legend; LeaderBoard/DriverGap informed the compact timing row. No real F1 feed or fabricated live racing data.
- [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing), Zlib: installed React adapter for SMAA and low-intensity bloom. Adaptive quality drops effects and reflections on slower rendering.

Retain Veloira tokens and actual STEP-derived display mesh. Engineering GLB axes are Z-up; renderer explicitly converts to Y-up and frames by the leading point of the car. Reaction time remains unavailable until supplied. Puff is illustrative because cartridge gas is unconfirmed.
