# M06 drawing-generator scope cleanup

Removed the Design Studio Drawings tab/form, `/v1/drawings/pdf` registration/module, build123d drawing generator and Typst drawing template. Removed judge-pack drawing generation, drawing-number metadata and README/missing-list claims. Judge-pack report, rules, solver records and evidence remain connected. The team still needs competition drawings; the project task/official requirements are not removed. No saved data or output files were deleted.

Active master task tables now exclude the eight removed tasks, including T22/T24; historical checklist arithmetic is 13/27 = 48.1%, solely a scope correction. Historical commit/handoff notes remain history.

Grouped checks: 25 Python judge-pack/beam/analysis tests passed; TypeScript and focused oxlint passed. Judge-pack tests check entries and hashes and explicitly assert drawings are neither included nor reported missing. Browser review deferred to the later UI batch. No additional dependency or external code needed for deletion.
