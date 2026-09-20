#!/usr/bin/env python3
"""Generate the Peepal brochure as a single continuous PDF.

Renders an HTML mirror of the /brochure page (cover, why-choose, feature grid,
closing) into one tall page so the download is continuous and does NOT depend
on the browser print dialog. Output: public/brochure/Peepal-Brochure.pdf

Run:  python3 scripts/build-brochure-pdf.py   (from the frontend/ dir)
Deps: pip install weasyprint
"""
import base64
import os
from weasyprint import HTML

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public", "brochure")
OUT = os.path.join(PUBLIC, "Peepal-Brochure.pdf")
PAGE_W = 820  # px


def data_uri(name):
    with open(os.path.join(PUBLIC, name), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


WAVES = data_uri("waves.png")
CAMPUS = data_uri("campus.png")

# Simple Feather-style icons keyed by module name (stroke = forest green).
S = 'fill="none" stroke="#1f5d36" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
ICONS = {
    "Student Management": f'<path {S} d="M3 8l9-4 9 4-9 4-9-4z"/><path {S} d="M7 10v5c0 1 2.5 2.5 5 2.5s5-1.5 5-2.5v-5"/>',
    "Employee Management": f'<circle cx="8" cy="9" r="2.4" {S}/><circle cx="16" cy="9" r="2.4" {S}/><path {S} d="M3 18c0-2.5 2.2-4 5-4M21 18c0-2.5-2.2-4-5-4"/>',
    "Attendance": f'<circle cx="12" cy="12" r="8" {S}/><path {S} d="M12 8v4l3 2"/>',
    "Marks & Grades": f'<path {S} d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>',
    "Leave Management": f'<rect x="4" y="5" width="16" height="15" rx="2" {S}/><path {S} d="M4 9h16M8 3v4M16 3v4"/>',
    "Payroll & Salary": f'<rect x="3" y="6" width="18" height="12" rx="2" {S}/><path {S} d="M16 12h2"/>',
    "Fee Collection": f'<path {S} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path {S} d="M9 8h6M9 12h6"/>',
    "Reports & Analytics": f'<path {S} d="M12 4a8 8 0 1 0 8 8h-8V4z"/>',
    "Announcements": f'<path {S} d="M4 10v4l10 4V6L4 10z"/><path {S} d="M14 8a4 4 0 0 1 0 8"/>',
    "Curriculum": f'<path {S} d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z"/><path {S} d="M4 19a2 2 0 0 1 2-2h12"/>',
    "Exams & Schedules": f'<rect x="6" y="4" width="12" height="16" rx="2" {S}/><path {S} d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
    "Grading Schemes": f'<path {S} d="M12 14a7 7 0 1 1 7-7"/><path {S} d="M12 14l4-4"/>',
    "Hostel": f'<path {S} d="M3 18v-5h18v5M3 13V8a1 1 0 0 1 1-1h6v6M14 13V9h6a1 1 0 0 1 1 1v3"/>',
    "Transport": f'<rect x="4" y="5" width="16" height="11" rx="2" {S}/><path {S} d="M4 11h16M7 16v2M17 16v2"/><circle cx="8" cy="13" r="0.6" {S}/><circle cx="16" cy="13" r="0.6" {S}/>',
    "Library": f'<path {S} d="M5 4h3v16H5zM10 4h3v16h-3z"/><path {S} d="M15 5l3 .6-2.5 14.4-3-.6z"/>',
    "Events": f'<path {S} d="M3 9a2 2 0 0 0 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2z"/><path {S} d="M14 5v14" stroke-dasharray="2 2"/>',
    "Timetable": f'<rect x="4" y="4" width="16" height="16" rx="2" {S}/><path {S} d="M4 10h16M4 15h16M10 4v16"/>',
    "Organization Structure": f'<rect x="9" y="3" width="6" height="4" rx="1" {S}/><rect x="3" y="16" width="6" height="4" rx="1" {S}/><rect x="15" y="16" width="6" height="4" rx="1" {S}/><path {S} d="M12 7v4M6 16v-2h12v2"/>',
    "Approvals": f'<circle cx="7" cy="6" r="2" {S}/><circle cx="7" cy="18" r="2" {S}/><circle cx="17" cy="12" r="2" {S}/><path {S} d="M7 8v8M9 6h4a2 2 0 0 1 2 2v2"/>',
    "Access Control": f'<path {S} d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path {S} d="M9 12l2 2 4-4"/>',
    "Notifications": f'<path {S} d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path {S} d="M10 20a2 2 0 0 0 4 0"/>',
    "Holidays & Calendar": f'<circle cx="12" cy="12" r="3.5" {S}/><path {S} d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"/>',
    "Student & Staff Portals": f'<rect x="3" y="4" width="18" height="16" rx="2" {S}/><path {S} d="M3 9h18M9 9v11"/>',
    "Invites & Onboarding": f'<circle cx="9" cy="8" r="3" {S}/><path {S} d="M3 19c0-3 2.7-5 6-5M16 8h5M18.5 5.5v5"/>',
    "Subscriptions & Quotas": f'<rect x="3" y="6" width="18" height="12" rx="2" {S}/><path {S} d="M3 10h18"/>',
}

CORE = [
    ("Student Management", "Every learner, one profile."),
    ("Employee Management", "People operations, uncomplicated."),
    ("Attendance", "Mark, see, fix in seconds."),
    ("Marks & Grades", "From raw scores to grade sheets."),
    ("Leave Management", "Ask. Approve. Track."),
    ("Payroll & Salary", "Run payroll with zero drama."),
    ("Fee Collection", "Know who owes what."),
    ("Reports & Analytics", "Answers, not spreadsheets."),
    ("Announcements", "Get the word out, right now."),
]
NEW = [
    ("Curriculum", "Map every course, unit by unit."),
    ("Exams & Schedules", "Plan every paper, every hall."),
    ("Grading Schemes", "Your scale, live SGPA & CGPA."),
    ("Hostel", "A bed for every student."),
    ("Transport", "Routes that run on time."),
    ("Library", "Every title, tracked."),
    ("Events", "Campus life, on a calendar."),
    ("Timetable", "Periods that fit, every section."),
    ("Organization Structure", "Who reports to whom."),
    ("Approvals", "Workflows that just flow."),
    ("Access Control", "The right eyes only."),
    ("Notifications", "Nothing slips through."),
    ("Holidays & Calendar", "The whole year at a glance."),
    ("Student & Staff Portals", "Self-service, sorted."),
    ("Invites & Onboarding", "Invite, set up, go."),
    ("Subscriptions & Quotas", "Scale on your terms."),
]
ALL = CORE + NEW


def card(name, tagline):
    icon = ICONS.get(name, "")
    return f"""
    <div class="card">
      <div class="tile"><svg viewBox="0 0 24 24" width="22" height="22">{icon}</svg></div>
      <div class="ctext"><div class="cname">{name}</div><div class="ctag">{tagline}</div></div>
    </div>"""


def pillar(title, desc):
    return f'<div class="pillar"><span class="dot"></span><div class="ptitle">{title}</div><div class="pdesc">{desc}</div></div>'


PILLARS = [
    ("Roles &amp; Permissions", "27+ scopes, role-based access end-to-end"),
    ("Data Ownership", "Export anything, CSV/PDF baked into every screen"),
    ("Audit &amp; Access", "Every action logged, one tenant per institute"),
    ("Built to Last", "Multi-tenant · Role-based · Audit-friendly · Modern stack"),
]

# closing dash field (simple, decorative)
dashes = ""
for r in range(9):
    t = r / 8
    for c in range(8):
        x = 90 + c * 80
        y = 60 + r * 60
        if t > 0.55:
            w = 26 + t * 10
            dashes += f'<polygon points="{x-w/2},{y+4} {x+w/2},{y+4} {x+w/2-5},{y-4} {x-w/2+5},{y-4}" fill="#13301c" opacity="{0.5+t*0.4:.2f}"/>'
        else:
            ang = 55 - t * 55
            dashes += f'<line x1="{x}" y1="{y-14}" x2="{x}" y2="{y+14}" stroke="#4f8a64" stroke-width="{2+t*4:.1f}" stroke-linecap="round" opacity="{0.35+t*0.4:.2f}" transform="rotate({ang:.0f} {x} {y})"/>'

HTML_DOC = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color:#163f25; }}
  .sheet {{ width:{PAGE_W}px; padding:54px 60px; }}
  .dark {{ background:#20512a; color:#fff; }}
  .label {{ font-size:11px; font-weight:700; letter-spacing:2px; color:#88c798; text-transform:uppercase; }}
  h1 {{ font-size:60px; font-weight:800; line-height:1.05; letter-spacing:-1px; }}
  .lead {{ font-size:26px; font-weight:700; line-height:1.2; }}
  .para {{ font-size:15px; line-height:1.6; color:#bcd9c4; }}
  .para-dark {{ color:#3a3a37; }}
  .waves {{ width:100%; height:200px; object-fit:cover; border-radius:12px; margin:36px 0; }}
  .footrow {{ display:flex; justify-content:space-between; align-items:flex-end; margin-top:60px; }}
  .fr {{ text-align:right; font-size:13px; line-height:1.6; color:#bcd9c4; }}
  .fr b {{ color:#fff; }} .fr .sg {{ color:#88c798; font-weight:700; }}
  .sub {{ font-size:21px; font-style:italic; color:#a9d3b6; line-height:1.25; margin-top:14px; }}
  .pillars {{ display:flex; gap:18px; margin-top:44px; }}
  .pillar {{ flex:1; border-top:2px solid #3a6b48; padding-top:14px; position:relative; }}
  .dot {{ position:absolute; top:-6px; left:0; width:10px; height:10px; border-radius:50%; background:#88c798; }}
  .ptitle {{ font-size:13px; font-weight:700; color:#fff; }}
  .pdesc {{ font-size:12px; color:#a9d3b6; line-height:1.5; margin-top:8px; }}
  .white h2 {{ font-size:30px; font-weight:700; color:#20512a; }}
  .campus {{ width:100%; height:300px; object-fit:cover; border-radius:16px; margin-top:28px; }}
  .fhead {{ background:#1f5d36; color:#fff; padding:48px 60px; }}
  .fhead h1 {{ font-size:52px; }}
  .fhead .sub2 {{ font-size:20px; font-style:italic; color:#a9d3b6; margin-top:10px; }}
  .grid {{ display:flex; flex-wrap:wrap; gap:14px; padding:40px 60px; }}
  .card {{ width:{(PAGE_W-120-28)//3}px; display:flex; align-items:center; gap:12px;
           border:1px solid #e2ece5; border-radius:12px; padding:14px; }}
  .tile {{ width:46px; height:46px; border-radius:11px; background:#f0f5f1; display:flex;
           align-items:center; justify-content:center; flex-shrink:0; }}
  .cname {{ font-size:14px; font-weight:700; color:#163f25; line-height:1.15; }}
  .ctag {{ font-size:12px; font-style:italic; color:#5b7a66; margin-top:3px; }}
  .ffoot {{ padding:0 60px 36px; text-align:right; font-size:14px; color:#4f9268; font-weight:500; }}
  .closing {{ position:relative; min-height:1000px; }}
  .closing h1 {{ font-size:54px; max-width:560px; position:relative; z-index:2; }}
  .dashwrap {{ position:absolute; left:40px; right:40px; top:230px; height:560px; z-index:1; }}
</style></head><body>

  <div class="sheet dark">
    <div class="label">Peepal · ERP for institutes</div>
    <h1 style="margin-top:30px;">Run every team.<br>Every workflow.</h1>
    <img class="waves" src="{WAVES}">
    <div class="lead" style="max-width:600px;">Most institutes run on six tools and a thousand spreadsheets.</div>
    <div class="para" style="margin-top:16px; max-width:640px;">Peepal replaces all of them with a single workspace where attendance, marks, leaves, payroll, fees, announcements and reports finally talk to each other, and to you. One platform. Every workflow. Built for scale, secured by role-based access, and ready on day one.</div>
    <div class="footrow">
      <div class="label">Edition · 2026</div>
      <div class="fr">Built for modern institutes<br><b>Book a demo</b><br>info@cybsec.co.in<br><span class="sg">Peepal</span></div>
    </div>
  </div>

  <div class="sheet dark">
    <h1 style="font-size:46px; max-width:640px;">Built for the people who actually run it.</h1>
    <div class="sub" style="max-width:520px;">Multi-tenant, role-based and audit-friendly. Designed for IT &amp; operations.</div>
    <div class="pillars">{''.join(pillar(t,d) for t,d in PILLARS)}</div>
  </div>
  <div class="sheet white">
    <h2>Why Choose Peepal?</h2>
    <div class="para para-dark" style="margin-top:16px; max-width:680px;">Peepal unifies all its modules: students, employees, attendance, marks, leaves, payroll, fees, reports and announcements; under one secure, role-based workspace. Every action is logged, every screen exports to CSV/PDF, and every user sees only the numbers that matter to them. Modern stack, one tenant per institute, zero drama.</div>
    <img class="campus" src="{CAMPUS}">
  </div>

  <div class="fhead">
    <h1>Feature deep dives</h1>
    <div class="sub2">Every module, up close. The workflows your teams live in.</div>
  </div>
  <div class="grid">{''.join(card(n,t) for n,t in ALL)}</div>
  <div class="ffoot">Peepal · Feature deep dives</div>

  <div class="sheet dark closing">
    <h1>Run your institute on one operating system.</h1>
    <div class="dashwrap"><svg viewBox="0 0 760 560" width="100%" height="100%" preserveAspectRatio="none">{dashes}</svg></div>
    <div class="footrow" style="position:relative; z-index:2;">
      <div class="sg" style="font-size:20px; font-weight:700; color:#88c798;">PEEPAL</div>
      <div class="fr">info@cybsec.co.in<br><span class="sg">Book a demo today</span></div>
    </div>
  </div>

</body></html>"""


def content_bottom(doc):
    page = doc.pages[0]
    box = page._page_box
    mx = 0

    def walk(b):
        nonlocal mx
        try:
            mx = max(mx, b.position_y + b.margin_height())
        except Exception:
            pass
        for ch in getattr(b, "children", []) or []:
            walk(ch)

    walk(box)
    return mx


# Pass 1: huge page, measure real content height.
tall = HTML_DOC.replace(
    "</style>", f"@page {{ size: {PAGE_W}px 40000px; margin:0; }}</style>"
)
doc = HTML(string=tall).render()
h = int(content_bottom(doc)) + 2

# Pass 2: render one continuous page exactly the content height.
final = HTML_DOC.replace(
    "</style>", f"@page {{ size: {PAGE_W}px {h}px; margin:0; }}</style>"
)
HTML(string=final).write_pdf(OUT)
print(f"wrote {OUT}  ({PAGE_W}x{h}px, 1 continuous page)")
