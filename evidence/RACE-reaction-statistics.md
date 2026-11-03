# Browser reaction practice statistics

Restores stored history on open, rather than waiting for a new result. Stores timestamped valid reactions and false starts separately, retaining the latest 500 attempts and rendering the latest 50 with native ECharts; median, linear-interpolated p10/p90 and sample SD never count false starts as zero-ms reactions. Full JSON and native PNG export available. Legacy numeric history is retained with null timestamps and excluded from the modern false-start denominator. Current two-key migration leaves the legacy key untouched; new records use versioned history.

Phase refs prevent duplicate input before render; key repeats/modifier/editable-field events ignored. Trials cancel when the page is hidden. Timers/listeners clean up on dialog unmount. Storage failure keeps a session copy and shows an export reminder. Existing chart/theme/controls and Zod used; no extra package or invented hardware timing. Browser display/scheduling/input latency remains explicit, so these do not claim measured race-day reaction times.

Three statistics/history contract tests, TypeScript and focused oxlint pass. Browser key/timer lifecycle, cross-tab synchronization and real latency comparison remain pending; no field data or false-start rule threshold was invented. No servers/CFD/heavy build.
