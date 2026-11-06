---
name: jewish-board-brand
description: >
  The Jewish Board brand compliance skill. Enforces strict brand standards for all outputs including
  PowerPoint presentations, PDFs, Word documents, Excel spreadsheets, React/HTML web apps, and any
  other deliverables. Use this skill whenever creating ANY visual or written output for The Jewish Board.
  This skill should trigger for ALL creative and document tasks, even if the user doesn't explicitly
  mention "brand" or "branding." If the output will be seen by anyone, it should follow these guidelines.
---

# The Jewish Board — Brand Skill

> **Speed tip:** Import `scripts/jb_brand.py` at the start of any Python-based output. It provides
> `COLORS`, `FONTS`, `docx_helpers`, `xlsx_helpers`, `pptx_helpers`, and `web_helpers` with all
> brand constants and ready-to-use builder functions. See [Quick-Start Code](#quick-start-code) below.

The Jewish Board (full legal name: The Jewish Board of Family and Children's Services) is New York's
largest provider of mental health and social services. The brand identity is warm, hopeful, vibrant,
and welcoming — reflecting the organization's mission of helping New Yorkers in every community
through every stage of life.

---

## Brand At a Glance

Before creating anything, internalize these core principles:

- **Warmth and hope**: The brand conveys optimism and care, never clinical coldness
- **Vibrant color**: Use the full palette — unexpected, lively color combinations are encouraged
- **Rounded frames**: The signature design element is the rounded rectangle (photo frames, content containers, section dividers)
- **The Radiant**: The logo symbol — created by spinning the Star of David, its overlap creates the central part while the points create its rays. It represents warmth, energy, and hope.
- **Two type families**: Mackinac Pro (serif, headlines) and Indivisible (sans-serif, body text)
- **Photojournalistic imagery**: Honest, direct, vivid photography showing real people and real NYC life
- **Left-aligned text**: All text is left-aligned, like the logo. Do not center text.

---

## Color Palette

Use these exact colors — no approximations, no off-brand colors. **Do not use tints of these colors.**

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| Sunshine Orange | `#f36c21` | (243,108,33) | Primary brand color, The Radiant logo |
| Cab Yellow | `#faa21b` | (250,162,27) | Accent, pairs with Orange |
| Classic Blue | `#2261ae` | (34,97,174) | Headlines, backgrounds, anchor color |
| Calming Blue | `#a1c1e6` | (161,193,230) | Light accent, backgrounds |
| Classic Purple | `#a3238e` | (163,35,142) | Accent, section dividers |
| Lavender | `#dd9dc6` | (221,157,198) | Light accent, backgrounds |
| Grounding Green | `#1a5a40` | (27,90,65) | Anchor color, nature themes |
| Spring Green | `#d6e040` | (214,224,64) | Bright accent, highlights |
| Brick Red | `#b04c32` | (176,76,50) | Warm accent, sparingly |
| Soft White | `#f1eee7` | (242,238,232) | Backgrounds, page color (not pure white) |
| Black | `#231f20` | (35,31,32) | Body text (not pure #000000) |
| White | `#ffffff` | (255,255,255) | Reversed text, clean backgrounds |

**Color pairing:** Orange+Blue (primary), Purple+Green (vibrant), Blue+Lavender (calming), Green+Spring Green (nature), Orange+Purple (energetic). Avoid low-contrast pairs on white (Yellow, Lavender).

**Chart color sequence:** Blue → Orange → Green → Purple → Yellow → Calming Blue → Lavender → Spring Green → Brick Red.

---

## Typography

### Font Families

| Role | Primary (Adobe Fonts) | Fallback (Google/System) |
|------|-----------------------|--------------------------|
| Headlines, quotes, display | **Mackinac Pro** Medium | **Lora** 500 / Georgia |
| Body, captions, UI, tables | **Indivisible** Regular/Semibold | **Inter** 400/600 / Arial |
| Section labels (rare) | **Indivisible Black** ALL CAPS | **Inter** 900 ALL CAPS |

### Typography Rules
- Headlines: Mackinac Pro Medium — always
- Body: Indivisible Regular, Semibold for emphasis
- Indivisible Black: occasional section headings only — all caps, 20–25% smaller than body
- Min size: 10pt print, 14px screen. Line spacing: 1.33×. Max line length: 75 chars.
- **All text is left-aligned.** Do not center text.
- Never use all caps in Mackinac. Never make Indivisible big. Never make Mackinac small.
- Use curly (typographer's) quotes — \u201C \u201D \u2018 \u2019 — never straight quotes.

---

## Logo Usage

The Radiant logo files are in `assets/`. Available: RGB, CMYK, Black, White (EPS format).

**Lock-up versions:** Primary, Full Name, Tagline ("Care for all New Yorkers"), Horizontal, Vertical, Small.

**Rules:** Min 100px screen / ⅜" print. Clear space uses proportional "X" system (~logo height ÷ 3). Never stretch, rotate, recolor, or crop. Use white version on dark backgrounds. Programs do not have logos — only The Jewish Board logo exists.

**Tagline:** "Care for all New Yorkers" — set in Indivisible, never paraphrase.

---

## Design Elements

- **Rounded frames**: Generous corner radius (~20–30px screen) for cards, photos, containers, call-outs
- **The Radiant motif**: Starburst pattern from logo, used as subtle decorative background element
- **Photography**: Photojournalistic, honest, vivid — real people in real NYC settings
- **Illustration**: NYC-themed custom library (transit, architecture, nature)

---

## Brand Voice

- **Personality**: Warm, welcoming, exacting, resourceful, adaptable, hopeful
- **Tone**: Warm, hopeful, empathetic — never clinical or bureaucratic
- **Language**: Clear, accessible, free of jargon
- **Always say**: "The Jewish Board" (not "JB" or abbreviations)

---

## Quick-Start Code

The helper module `scripts/jb_brand.py` provides everything needed. Import it at the top of any
generation script:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))
from jb_brand import COLORS, FONTS, docx_helpers, xlsx_helpers, pptx_helpers, web_helpers
```

Below are ready-to-use patterns for each output type.

---

### PowerPoint (.pptx)

**Template:** `assets/Branded-PowerPoint-Template.potx` — 30 layouts, widescreen 16:9.

```python
# Load template (handles .potx content type conversion)
prs = pptx_helpers.load_template("assets/Branded-PowerPoint-Template.potx")

# Add slides by layout name
slide = pptx_helpers.add_slide(prs, "title_purple")
pptx_helpers.set_placeholder_text(slide, 0, "Annual Report 2025")
pptx_helpers.set_placeholder_text(slide, 1, "The Jewish Board")

slide2 = pptx_helpers.add_slide(prs, "one_content")
pptx_helpers.set_placeholder_text(slide2, 0, "Key Metrics")
pptx_helpers.set_placeholder_text(slide2, 12, "45,000 New Yorkers served\n270+ Programs\n93% Satisfaction")

prs.save("output.pptx")
```

**Available layout keys** (use with `pptx_helpers.add_slide(prs, key)`):

| Key | Description | Key Placeholders |
|-----|-------------|------------------|
| `title_orange` / `title_purple` / `title_green` | Title slides | 0=Title, 1=Subtitle |
| `one_content` | Single content area | 0=Title, 12=Content |
| `two_content` | Two columns | 0=Title, 12+13=Content |
| `content_and_picture` | Content + image | 0=Title, 12=Content, 14=Picture |
| `divider_blue_plain` / `_radiant` / `_city` / `_picture` | Blue dividers | 10=Body |
| `divider_purple_*` / `divider_green_*` | Color variants | 10=Body |
| `quote_blue_plain` / `_city` | Quote slides | 13=Quote, 14=Attribution |
| `quote_purple_*` / `quote_green_*` | Color variants | 13=Quote, 14=Attribution |
| `end` | End slide | 0=Title |

**PPTX rules:** Pick one color theme (Blue/Purple/Green) for dividers and quotes. Start with Title, end with End. All text left-aligned. Use curly quotes. No tints.

---

### Word Documents (.docx)

```python
# Create branded document
doc = docx_helpers.setup_document()  # Sets fonts, margins, defaults

# Headings (level 0=DocTitle, 1=H1, 2=H2, 3=H3)
docx_helpers.add_heading(doc, "2025 Program Overview", level=0)
docx_helpers.add_heading(doc, "About The Jewish Board", level=1)

# Body text
docx_helpers.add_body(doc, "The Jewish Board is New York\u2019s largest provider of mental health and social services.")

# Bullet points
docx_helpers.add_bullet(doc, "45,000 New Yorkers served annually")
docx_helpers.add_bullet(doc, "270+ programs across all five boroughs")

# Branded table (auto-styled with blue header, alternating rows)
docx_helpers.add_branded_table(doc,
    headers=["Metric", "Value"],
    rows=[["New Yorkers served", "45,000"], ["Programs", "270+"], ["Satisfaction", "93%"]]
)

# Pull quote
docx_helpers.add_quote(doc,
    "The Jewish Board gave my family hope when we had none.",
    "Program participant, Brooklyn"
)

doc.save("output.docx")
```

**Heading hierarchy:**

| Level | Font | Size | Color |
|-------|------|------|-------|
| 0 (Doc Title) | Lora | 28pt | Classic Blue |
| 1 (H1) | Lora | 22pt | Classic Blue |
| 2 (H2) | Inter Semibold | 16pt | Grounding Green |
| 3 (H3) | Inter Semibold | 13pt | Black |

**Spacing:** Before H1: 24pt, H2: 18pt, H3: 12pt. After all: 6pt. Line spacing: 1.33.

**Tables:** Blue header row (#2261ae, white text), alternating Soft White / White rows. Light borders.

**Call-out boxes:** Rounded rectangles, Calming Blue or Lavender at 20% opacity background, 1pt solid border.

---

### Excel Spreadsheets (.xlsx)

```python
wb = xlsx_helpers.setup_workbook()
ws = wb.active
ws.title = "Program Summary"

# Write a complete branded sheet in one call
xlsx_helpers.write_branded_sheet(ws,
    title="The Jewish Board \u2014 Program Data",
    subtitle="FY 2025",
    headers=["Program", "Borough", "Clients", "Sessions", "Satisfaction"],
    rows=[
        ["Mental Health", "Manhattan", 4200, 2800, "94%"],
        ["Family Services", "Brooklyn", 3800, 1950, "91%"],
        ["Crisis Intervention", "Bronx", 2100, 850, "89%"],
    ],
    number_cols=[2, 3]  # Right-align and bold-blue these columns
)

wb.save("output.xlsx")
```

**Formatting:** Title row in Lora 16pt Blue. Header row: Blue fill, white text, Semibold. Data: alternating Soft White / White. Number columns: right-aligned, bold blue. Auto-width columns. Frozen header row.

**Accent formatting for conditional coloring:**
- Success: Green text (#1a5a40) or Spring Green fill (#d6e040)
- Warning: Orange text (#f36c21) or Yellow fill (#faa21b)
- Alert: Brick Red text (#b04c32)
- Highlight: Purple text (#a3238e) or Lavender fill (#dd9dc6)

---

### Web Apps / HTML / React

```python
# Generate a complete branded HTML page
html = web_helpers.full_html_template(
    title="The Jewish Board \u2014 Dashboard",
    body_content="""
    <header class="jb-header">
      <div><h1>The Jewish Board</h1><p>Care for all New Yorkers</p></div>
    </header>
    <main class="main">
      <div class="jb-stats-grid">
        <div class="jb-stat-card">
          <div class="jb-stat-number">45,000</div>
          <div class="jb-stat-label">New Yorkers Served</div>
        </div>
      </div>
      <table class="jb-table">
        <thead><tr><th>Program</th><th>Clients</th></tr></thead>
        <tbody><tr><td>Mental Health</td><td>4,200</td></tr></tbody>
      </table>
      <div class="jb-quote">
        <blockquote>\u201CThe Jewish Board gave my family hope.\u201D</blockquote>
        <cite>\u2014 Program participant</cite>
      </div>
    </main>
    <footer class="footer">The Jewish Board &middot; jewishboard.org</footer>
    """
)
with open("output.html", "w") as f:
    f.write(html)
```

**Built-in CSS classes** (from `full_html_template` and `component_styles`):
- `.jb-header` — branded header bar with orange border-bottom
- `.jb-card` — rounded white card with shadow
- `.jb-stats-grid` + `.jb-stat-card` + `.jb-stat-number` / `.jb-stat-label` — stat cards
- `.jb-table` — branded data table (blue header, alternating rows)
- `.jb-quote` — purple-bordered quote card with blockquote + cite
- `.jb-btn-primary` — orange button
- `.main` — centered content area (max-width 1200px)
- `.footer` — branded footer

**Google Fonts:** `web_helpers.google_fonts_link()` returns the `<link>` tag (Lora + Inter).

**React (.jsx):** Use the same CSS classes via `<style>` blocks. Import `useState` etc. from React. Use `className` instead of `class`. All text `text-left`.

**Accessibility:** Blue on white passes AA. Orange on white passes for large text only. Black on Soft White passes AA.

---

## Reference Files

For edge cases or deeper detail, the original reference guides are preserved in `references/`:
- `references/pptx-guide.md` — Full layout index, placeholder details
- `references/docs-guide.md` — Complete heading hierarchy, PDF generation notes
- `references/web-guide.md` — Full CSS foundation, all component patterns
- `references/xlsx-guide.md` — Number formatting, sheet organization, chart styling

Most tasks should NOT require reading these — the quick-start code and rules above cover 95% of use cases.
