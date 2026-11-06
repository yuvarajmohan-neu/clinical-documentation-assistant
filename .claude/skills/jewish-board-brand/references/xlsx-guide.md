# Spreadsheet Guide — The Jewish Board

## Overview

Branded spreadsheets should look professional and be immediately recognizable as
Jewish Board materials. The key branding elements are the color palette in headers
and accents, clean typography, and organized layout.

## Standard Formatting

### Title Area (Row 1–3)
- Row 1: Document title in Mackinac Pro / Lora or default serif, 16pt, Classic Blue (#2261ae)
- Row 2: Subtitle or date in Indivisible / Inter or default sans-serif, 11pt, Black (#231f20)
- Row 3: Empty (spacer row, height ~6pt)

### Header Row
- Background: Classic Blue (#2261ae)
- Text: White (#ffffff), Semibold, 11pt
- Font: Indivisible / Inter / Calibri (whatever is available)
- Bottom border: 2px solid, slightly darker blue
- Cell padding: comfortable (row height ~30pt)
- Text alignment: left-aligned

### Data Rows
- Alternating colors:
  - Odd rows: White (#ffffff)
  - Even rows: Soft White (#f1eee7)
- Text: Black (#231f20), Regular, 10–11pt
- Row height: ~22pt for readability
- Text alignment: left-aligned (numbers may be right-aligned)

### Accent Formatting
Use brand colors for special cells and conditional formatting:
| Purpose | Color | Hex |
|---------|-------|-----|
| Positive / Success | Grounding Green | #1a5a40 (text) or Spring Green #d6e040 (fill) |
| Warning / Attention | Sunshine Orange | #f36c21 (text) or Cab Yellow #faa21b (fill, light) |
| Negative / Alert | Brick Red | #b04c32 |
| Highlight / Selected | Classic Purple | #a3238e (text) or Lavender #dd9dc6 (fill) |
| Info / Neutral | Classic Blue | #2261ae (text) or Calming Blue #a1c1e6 (fill) |

Do not use tints of brand colors or any off-brand colors.

### Borders
- Use light borders only: #cccccc or #e0dcd6
- No heavy gridlines — keep the spreadsheet clean and modern
- Header row gets a slightly thicker bottom border

### Column Widths
- Auto-fit to content, then add ~20% padding
- Minimum column width: 80px
- Maximum: 300px (wrap text for longer content)

## Charts in Spreadsheets

Use the same color sequence as web apps:
1. Classic Blue (#2261ae)
2. Sunshine Orange (#f36c21)
3. Grounding Green (#1a5a40)
4. Classic Purple (#a3238e)
5. Cab Yellow (#faa21b)
6. Calming Blue (#a1c1e6)

Chart styling:
- Title: Mackinac Pro / Lora / serif, Classic Blue
- Axis labels: Indivisible / Inter / sans-serif, Black (#231f20)
- Gridlines: very light (#e8e4de)
- No chart border or use rounded corners if the library supports it
- Legend: bottom or right, Indivisible / Inter / sans-serif

## Number Formatting
- Currency: $#,##0.00
- Percentages: 0.0%
- Dates: MM/DD/YYYY or Month DD, YYYY
- Large numbers: #,##0
- Use consistent decimal places within each column

## Sheet Organization
- First sheet: Summary / Dashboard (if multi-sheet workbook)
- Use descriptive sheet names (not "Sheet1", "Sheet2")
- Freeze the header row for scrollability
- Include a print area if the spreadsheet may be printed

## Implementation Notes (openpyxl)

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# Brand colors as fills
BLUE_FILL = PatternFill(start_color="2261ae", end_color="2261ae", fill_type="solid")
SOFT_WHITE_FILL = PatternFill(start_color="f1eee7", end_color="f1eee7", fill_type="solid")
WHITE_FILL = PatternFill(start_color="ffffff", end_color="ffffff", fill_type="solid")

# Fonts (Indivisible / Inter fallback)
HEADER_FONT = Font(name="Indivisible", size=11, bold=True, color="ffffff")
BODY_FONT = Font(name="Indivisible", size=10, color="231f20")
TITLE_FONT = Font(name="Mackinac Pro", size=16, color="2261ae")

# Alignment — always left-aligned
LEFT_ALIGN = Alignment(horizontal="left", vertical="center")

# Borders
LIGHT_BORDER = Border(
    bottom=Side(style="thin", color="e0dcd6")
)
```
