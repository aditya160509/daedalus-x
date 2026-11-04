// Daedalus X compact FORGE summary. Data arrives as JSON in sys.inputs.data.
#let d = json(bytes(sys.inputs.data))
#let counts = d.counts
#let sha(v) = if v == none { "unavailable" } else { v }
#set document(title: "Daedalus X FORGE summary")
#set page(paper: "a4", margin: 14mm, numbering: "1",
  footer: context [#set text(7.5pt, fill: gray); Daedalus X · #d.generated · #d.revision #h(1fr) #counter(page).display()])
#set text(font: ("Inter", "Helvetica", "Arial"), size: 9pt)

= FORGE compliance summary
#text(9pt, fill: gray)[#d.revision · design #raw(d.design) · #d.generated]

#text(8pt, fill: gray)[CAD screening only. A CAD pass is not measured scrutineering approval, and unmeasurable rules remain in manual review.]

#v(4pt)
#table(columns: (1fr, 1fr, 1fr, 1fr), stroke: 0.4pt + luma(200), inset: 6pt,
  [*CAD fail*], [*At risk*], [*Manual review*], [*CAD pass*],
  [#counts.fail], [#counts.risk], [#counts.manual], [#counts.cad_pass],
)
#text(8pt, fill: gray)[#counts.total rules checked. #d.manual_review manual-review rule(s) are counted but not shown as passing. #d.unquantified_rules.len() finding(s) have no stated points penalty.]

#v(4pt)
#table(columns: (1fr, 1fr, 1fr), stroke: 0.4pt + luma(200), inset: 6pt,
  [*Points lost on current CAD fails*], [*Points at risk*], [*Rules to measure by hand*],
  [#d.failing_points], [#d.at_risk_points], [#d.manual_review],
)

== Findings needing action
#if d.findings.len() == 0 [
  No failing or at-risk CAD findings are recorded.
] else [
  #table(columns: (auto, 1fr, auto, auto, auto), stroke: 0.4pt + luma(200), inset: 4pt,
    [*Rule*], [*Finding*], [*Page*], [*CAD value*], [*Margin*],
    ..d.findings.map(f => (
      [#f.id #linebreak() #text(7pt, fill: gray)[#f.state]],
      [#f.name #linebreak() #text(7pt, fill: gray)[limit #f.limit · #f.penalty]],
      [#f.page],
      [#f.value],
      [#f.margin],
    )).flatten(),
  )
]
#if d.omitted_findings > 0 [
  #text(8pt, fill: gray)[#d.omitted_findings further finding(s) are omitted from this one-page overview. Use the full scrutineering sheet for every row.]
] else [
  #text(8pt, fill: gray)[All failing and at-risk findings fit on this page. The full scrutineering sheet still carries every rule and the blank measurement columns.]
]

#let ident = d.at("identity", default: none)
#if ident != none [
  #let rb = ident.rulebook
  #let geo = ident.geometry
  #let code = ident.code
  == Source identity
  #table(columns: (auto, 1fr), stroke: 0.4pt + luma(200), inset: 4pt,
    [Rulebook YAML], [#rb.file · revision #rb.revision · SHA-256 #raw(sha(rb.sha256))],
    [Geometry JSON], [#geo.file · SHA-256 #raw(sha(geo.sha256))],
    [Code snapshot], [#code.label],
    [Generated], [#d.generated],
  )
  #text(7.5pt, fill: gray)[
    The YAML revision and its SHA-256 identify the local rule source, not an official PDF.
    #if ident.official_rule_pdf_archived [The official rule PDF is archived.] else [No official rule PDF is archived by this export.]
  ]
]

#v(2pt)
#text(7.5pt, fill: gray)[This summary is generated from CAD geometry checks and rulebook penalties. It does not replace the full scrutineering sheet, physical measurement or official judging.]
