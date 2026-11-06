# PDF & Word Document Guide — The Jewish Board

## General Document Standards

All documents produced for The Jewish Board should feel warm, professional, and on-brand.
The visual tone is approachable — not corporate-sterile.

## Page Setup

### Margins and Layout
- Margins: 1 inch on all sides (standard)
- For reports or formal documents: consider 0.75 inch margins for more content space
- Page size: US Letter (8.5" x 11") unless otherwise specified

### Background
- Default: White (#ffffff) for most formal documents
- Optional: Soft White (#f1eee7) as a page tint for warmer feel (especially for marketing materials, brochures, flyers)
- Never use bright or dark full-page backgrounds for body content pages

## Typography

### For Word Documents (.docx)
Since custom fonts may not be available on every system, use these in order of preference:
1. Mackinac Pro + Indivisible (if installed — available via Adobe Fonts)
2. Lora + Inter (Google Fonts, widely available)
3. Georgia + Arial (universal fallback — acceptable but not ideal)

### Heading Hierarchy
| Level | Font | Size | Color | Weight |
|-------|------|------|-------|--------|
| Document Title | Mackinac Pro / Lora | 28pt | Classic Blue #2261ae | Medium |
| H1 | Mackinac Pro / Lora | 22pt | Classic Blue #2261ae | Medium |
| H2 | Indivisible / Inter | 16pt | Grounding Green #1a5a40 or Classic Purple #a3238e | Semibold |
| H3 | Indivisible / Inter | 13pt | Black #231f20 | Semibold |
| Section Label | Indivisible Black / Inter Black | 9–10pt | Black #231f20 | Black, ALL CAPS |
| Body | Indivisible / Inter | 11pt | Black #231f20 | Regular |
| Caption | Indivisible / Inter | 9pt | Black #231f20 | Regular/Italic |

### Spacing
- Before H1: 24pt
- Before H2: 18pt
- Before H3: 12pt
- After all headings: 6pt
- Paragraph spacing: 6pt after (50% of leading)
- Line spacing: 1.3 to 1.5 (133% recommended)
- Tracking: -20 (metrics) for body text

### Typography Rules
- All text is left-aligned — do not center text
- Keep lines short — 75 characters at most
- Never use all caps in Mackinac / Lora — all-caps is only for section labels in Indivisible Black
- Never make Indivisible / Inter oversized — keep it for body/small text
- Never make Mackinac / Lora small — keep it for headlines/large text
- Use curly (typographer's) quotes, never straight "dumb" quotes
- Hang quotation marks outside the text frame when possible

## Brand Elements in Documents

### Cover Page
- Include The Jewish Board logo (left-aligned or top-left preferred)
- Document title in Mackinac Pro / Lora, large size
- Use a brand color block (rounded rectangle) as a decorative element
- Optionally include the tagline: "Care for all New Yorkers"

### Headers and Footers
- Header: The Jewish Board logo (small, top-left or top-right)
- Footer: Page number, document title or date
- Use a thin colored line (Classic Blue or Sunshine Orange) as a header/footer separator

### Call-out Boxes
Use rounded rectangles with:
- Background: Calming Blue (#a1c1e6) at 20% opacity, or Lavender (#dd9dc6) at 20%, or Soft White (#f1eee7)
- Border: 1pt solid in the corresponding full-strength color
- Corner radius: generous (the visual equivalent of ~10-15pt)
- Padding: comfortable (at least 10pt on all sides)

### Tables
- Header row: Classic Blue (#2261ae) background, white text, Indivisible Semibold
- Body rows: alternating White and Soft White (#f1eee7)
- Borders: light gray (#cccccc) or Calming Blue (#a1c1e6)
- No heavy grid lines — keep it clean
- Do not use tints of brand colors or off-brand colors

### Charts and Graphs
Use brand colors exclusively:
- Primary data series: Classic Blue (#2261ae)
- Secondary: Sunshine Orange (#f36c21)
- Tertiary: Grounding Green (#1a5a40)
- Additional: Classic Purple (#a3238e), Cab Yellow (#faa21b)
- Avoid: Brick Red for large areas (use sparingly)

## For PDFs Specifically

### When generating PDFs programmatically (e.g., with reportlab, fpdf2, weasyprint):
- Embed fonts: Use Lora and Inter from Google Fonts if Mackinac Pro / Indivisible aren't available
- Set metadata: title, author ("The Jewish Board"), subject
- Use brand colors for all decorative elements
- Apply rounded clipping paths for image frames where the library supports it

### When converting from other formats:
- Ensure fonts are embedded
- Verify colors haven't shifted (especially Orange — it should remain #f36c21)
- Check that the logo renders cleanly at the output resolution
