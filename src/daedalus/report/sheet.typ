// Daedalus X scrutineering sheet. Data arrives as JSON in sys.inputs.data.
#let d = json(bytes(sys.inputs.data))
#set document(title: "Daedalus X scrutineering sheet")
#set page(paper: "a4", flipped: true, margin: 12mm, numbering: "1",
  footer: context [#set text(8pt, fill: gray); Daedalus X · #d.generated · rulebook #d.revision · data #d.hash #h(1fr) #counter(page).display()])
#set text(font: ("Inter", "Helvetica", "Arial"), size: 8.5pt)
#let tone(c) = if c == "safety" { rgb("#b42318") } else if c == "performance" { rgb("#a15c07") } else { luma(90) }

= Scrutineering sheet
#text(10pt, fill: gray)[#d.revision · design #raw(d.design) · #d.generated]

#table(columns: (1fr, 1fr, 1fr), stroke: 0.4pt + luma(200), inset: 6pt,
  [*Points lost on the CAD checks:* #d.failing_points],
  [*Points at risk:* #d.at_risk_points],
  [*Rules to measure by hand:* #d.manual_review],
)
#text(8pt, fill: gray)[CAD results come from part bounding boxes and are estimates until the car is measured. Measure every "measure" row and every "AT RISK" row on both cars.]

#v(4pt)
#table(
  columns: (auto, 1fr, auto, auto, auto, auto, 14mm, 14mm, 30mm),
  stroke: 0.4pt + luma(200), inset: 4pt, align: (left, left, left, left, left, left, center, center, left),
  table.header([*Rule*], [*Overview*], [*Class*], [*Limit*], [*Penalty*], [*CAD*], [*Car A*], [*Car B*], [*Remarks*]),
  ..d.rows.map(r => (
    [#r.id #text(7pt, fill: gray)[p.#r.page]],
    [#r.name],
    text(fill: tone(r.class), weight: "bold")[#upper(r.class)],
    [#r.limit],
    [#r.penalty],
    [#r.value #linebreak() #text(7pt, fill: gray)[#r.state]],
    [], [], [],
  )).flatten(),
)
