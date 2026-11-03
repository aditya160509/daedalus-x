# C07 Race navigation

Race now has four main tabs: Replay, Analysis, Points and Calibration. Analysis selects one of Telemetry, Spread, Breakdown or Energy and mounts only the active panel; the existing race requests, channel/cursor state, ghost, configuration and preset flows remain in the workspace. Energy and breakdown requests run only while their corresponding Analysis view is active.

The start-light trainer opens in a Base UI dialog from Replay. The trainer is mounted only while the dialog is open, so its R-key handler and timers are removed on close. Existing `#telemetry`, `#spread`, `#breakdown` and `#energy` links select the matching Analysis view; `#start` selects Replay and opens the trainer. The initial hash is read after hydration without being replaced first, and subsequent navigation updates the hash.

No dependencies or external code were added. Per task instruction, automated checks and browser validation were deferred to the parent batch; responsive layout, hash/back navigation and dialog keyboard behavior still need browser verification.

Parent batch: TypeScript compilation and focused oxlint passed. Trigger uses native Base UI DialogTrigger for focus restoration. Browser verification remains pending.
