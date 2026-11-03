# Signed component drag waterfall

ForceBars reuses existing component pressure and viscous force records. Native ECharts stacked floating bars (stackStrategy all) show each signed net contribution and a computed component sum. Negative components and zero crossings are preserved, not clamped. Pressure/friction bars remain available through the existing Base UI segmented control. PNG export and model/uncertainty caveats added. The computed sum does not imply a passing total-force consistency gate.

No extra library, CFD, server or mesh work. Native ECharts usage covered by existing Apache-2.0 attribution. A focused test covers negative contribution, both directions across zero and signed final sum. TypeScript, focused oxlint and the test pass. Browser layout, tooltip behavior and an accepted-CFD example remain unverified.
