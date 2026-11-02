#let d = json(bytes(sys.inputs.data))
#set document(title: "Daedalus X engineering drawings", author: d.team)
#set page(paper: "a4", margin: 12mm,
  footer: context [#set text(size: 7pt, fill: gray); #d.number · #d.team · #d.design #h(1fr) #counter(page).display() / #counter(page).final().first()])
#set text(font: ("Inter", "Helvetica", "Arial"), size: 8pt)
#set par(leading: 0.5em)
#for (i, p) in d.pages.enumerate() {
  if i > 0 { pagebreak() }
  text(size: 8pt, fill: gray)[ENGINEERING DRAWINGS · INDIA NF 2025-26 · C2.10.6]
  v(3mm)
  text(size: 19pt, weight: "bold")[#p.number. #p.title]
  parbreak()
  text(fill: gray)[#p.requirement]
  v(2mm)
  block(width: 100%, inset: 2mm, fill: luma(240))[
    *DRAFT - ENGINEERING REVIEW REQUIRED* · Units mm · Orthographic views fit to sheet; do not scale.
  ]
  v(3mm)
  if p.views.len() > 0 {
    grid(columns: (1fr, 1fr), gutter: 4mm,
      ..p.views.map(v => block(height: 60mm)[
        #text(size: 7pt, weight: "bold")[#v.caption]
        #image(v.file, width: 100%, height: 54mm, fit: "contain")
      ]))
  }
  if p.parts.len() > 0 {
    v(3mm)
    text(weight: "bold")[Component key and overall extents (not local feature dimensions)]
    table(columns: (1fr, 17mm, 17mm, 17mm), inset: 1.2mm, stroke: 0.3pt + luma(210),
      table.header([*STEP component*], [*X mm*], [*Y mm*], [*Z mm*]),
      ..p.parts.map(r => ([#r.label], [#r.x], [#r.y], [#r.z])).flatten())
  }
  if p.note != "" { v(2mm); text(weight: "bold")[Team engineering notes]; parbreak(); p.note }
  if p.checks.len() > 0 {
    v(2mm)
    text(weight: "bold")[Related FORGE findings]
    parbreak()
    text(size: 7pt)[#p.checks.join("\n")]
  }
  v(2mm)
  text(weight: "bold")[Review register]
  for issue in p.issues { parbreak(); text(size: 7pt)[• #issue] }
  v(2mm)
  text(size: 6pt, fill: gray)[STEP SHA-256 #d.source_hash #linebreak() Geometry SHA-256 #d.geometry_hash]
}
