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

#if d.at("hero_run", default: none) != none [
  #figure(image("hero.png", width: 100%),
    caption: [Surface Cp and streamtubes coloured by U/U#sub[∞], run #raw(d.hero_run)])
]

== Summary
#table(columns: (1fr, auto), stroke: 0.4pt + luma(200), inset: 6pt,
  [Best drag area (CdA)], [#calc.round(d.oracle.best.cda_m2 * 10000, digits: 2) cm²],
  [Predicted race time], [#calc.round(d.oracle.best.race_time_s, digits: 3) s],
  [ORACLE observations], [#d.oracle.observations.len()],
  [Rule checks failing (CAD)], [#d.forge.checks.filter(c => c.state == "fail_cad").len()],
)
#src[ORACLE state, provenance #d.oracle.provenance]

== ORACLE: next experiment
#table(columns: (1fr, auto), stroke: 0.4pt + luma(200), inset: 6pt,
  ..d.oracle.variables.map(v => ([#v.name.replace("_", " ")], [#calc.round(d.oracle.next.params.at(v.name), digits: 2) #v.unit])).flatten(),
  [Predicted CdA (mean +/- 1 SD)], [#calc.round(d.oracle.next.cda_m2 * 10000, digits: 2) ± #calc.round(d.oracle.next.cda_sd_m2 * 10000, digits: 2) cm²],
)
#let benchmark = d.oracle.at("benchmark", default: none)
#if benchmark != none and benchmark.gp.len() > 0 and benchmark.lhs.len() > 0 [
  Synthetic equal-budget benchmark after #benchmark.gp.len() evaluations per method:
  ORACLE #calc.round(benchmark.gp.last() * 10000, digits: 3) cm² vs
  Latin hypercube #calc.round(benchmark.lhs.last() * 10000, digits: 3) cm².
  This is not accepted CFD or physical validation.
] else [
  No completed registered benchmark is available. No optimisation-performance claim is made.
]

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

#let ident = d.at("identity", default: none)
#if ident != none [
  #let rb = ident.rulebook
  #let geo = ident.geometry
  #let code = ident.code
  #v(6pt)
  == Source identity
  #table(columns: (auto, 1fr), stroke: 0.4pt + luma(200), inset: 4pt,
    [Rulebook YAML], [#rb.file · revision #rb.revision · SHA-256 #text(7pt)[#if rb.sha256 == none [unavailable] else [#rb.sha256]]],
    [Geometry JSON], [#geo.file · SHA-256 #text(7pt)[#if geo.sha256 == none [unavailable] else [#geo.sha256]]],
    [Code snapshot], [#code.label · captured #code.at("captured_at", default: "unavailable")],
    [Generated], [#d.generated · data hash #d.hash],
  )
  #text(7.5pt, fill: gray)[
    The YAML revision and hash identify the local rule source, not an official PDF.
    #if ident.official_rule_pdf_archived [The official rule PDF is archived.] else [No official rule PDF is archived by this export.]
    The data hash covers the oracle and forge payload only; it is not a physical acceptance record.
  ]
]

