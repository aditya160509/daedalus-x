// Daedalus X engineering report. Data arrives as JSON in sys.inputs.data.
#let d = json(bytes(sys.inputs.data))
#set document(title: "Daedalus X engineering report")
#set page(paper: "a4", margin: 18mm, numbering: "1",
  footer: context [#set text(8pt, fill: gray); Daedalus X · #d.generated · data #d.hash #h(1fr) #counter(page).display()])
#set text(font: ("Inter", "Helvetica", "Arial"), size: 10pt)
#show heading.where(level: 1): set text(16pt)
#let src(p) = text(8pt, fill: gray)[source: #p]

= Daedalus X — engineering report
#text(11pt, fill: gray)[Team Veloira · #d.generated]

== Summary
#table(columns: (1fr, auto), stroke: 0.4pt + luma(200), inset: 6pt,
  [Best drag area (CdA)], [#calc.round(d.oracle.best.cda_m2 * 10000, digits: 2) cm²],
  [Predicted race time], [#calc.round(d.oracle.best.race_time_s, digits: 3) s],
  [CFD runs], [#d.oracle.observations.len()],
  [Rule checks failing (CAD)], [#d.forge.checks.filter(c => c.state == "fail_cad").len()],
)
#src[ORACLE state, provenance #d.oracle.provenance]

== ORACLE: next experiment
#table(columns: (1fr, auto), stroke: 0.4pt + luma(200), inset: 6pt,
  ..d.oracle.variables.map(v => ([#v.name.replace("_", " ")], [#calc.round(d.oracle.next.params.at(v.name), digits: 2) #v.unit])).flatten(),
  [Predicted CdA], [#calc.round(d.oracle.next.cda_m2 * 10000, digits: 2) ± #calc.round(d.oracle.next.cda_sd_m2 * 10000, digits: 2) cm²],
)
Budget-matched benchmark after #d.oracle.benchmark.gp.len() runs: ORACLE #calc.round(d.oracle.benchmark.gp.last() * 10000, digits: 3) cm² vs random #calc.round(d.oracle.benchmark.lhs.last() * 10000, digits: 3) cm².

== FORGE: rule compliance (#d.forge.revision)
#if d.forge.is_reference_only [_Reference rulebook; replace with the event's own regulations._]
#table(columns: (auto, 1fr, auto, auto, auto), stroke: 0.4pt + luma(200), inset: 5pt,
  [*Rule*], [*Check*], [*Value*], [*Margin*], [*State*],
  ..d.forge.checks.map(c => (
    [#c.rule_id (p. #c.page)], [#c.name],
    [#if c.value != none [#calc.round(c.value, digits: 1) #c.unit] else [—]],
    [#if c.margin != none [#calc.round(c.margin, digits: 1)] else [—]],
    [#c.state.replace("_", " ")],
  )).flatten(),
)
#src[geometry.json bounding boxes; CAD-only until measured]
