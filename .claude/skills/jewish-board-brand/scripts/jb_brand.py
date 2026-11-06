"""
The Jewish Board — Brand Helper Module
========================================
Import this module when creating ANY branded output for The Jewish Board.
Provides brand colors, fonts, and pre-built utility functions for docx, xlsx,
pptx, and web outputs.

Usage:
    from jb_brand import COLORS, FONTS, docx_helpers, xlsx_helpers, pptx_helpers
"""

import io
import zipfile
from dataclasses import dataclass


# ============================================================================
# BRAND COLORS
# ============================================================================

@dataclass(frozen=True)
class BrandColor:
    """A single brand color with all format variants."""
    name: str
    hex: str       # e.g. "#f36c21"
    rgb: tuple     # e.g. (243, 108, 33)

    @property
    def hex_no_hash(self) -> str:
        return self.hex.lstrip("#")

    @property
    def r(self): return self.rgb[0]
    @property
    def g(self): return self.rgb[1]
    @property
    def b(self): return self.rgb[2]

    def as_docx_rgb(self):
        """Return docx RGBColor."""
        from docx.shared import RGBColor
        return RGBColor(self.r, self.g, self.b)

    def as_openpyxl_fill(self, fill_type="solid"):
        """Return openpyxl PatternFill."""
        from openpyxl.styles import PatternFill
        return PatternFill(start_color=self.hex_no_hash, end_color=self.hex_no_hash, fill_type=fill_type)

    def as_openpyxl_font_color(self):
        """Return hex string for openpyxl Font(color=...)."""
        return self.hex_no_hash

    def as_css_var(self, var_name: str) -> str:
        """Return CSS custom property declaration."""
        return f"--{var_name}: {self.hex};"


class _Colors:
    """All Jewish Board brand colors."""
    ORANGE       = BrandColor("Sunshine Orange",  "#f36c21", (243, 108, 33))
    YELLOW       = BrandColor("Cab Yellow",       "#faa21b", (250, 162, 27))
    BLUE         = BrandColor("Classic Blue",     "#2261ae", (34, 97, 174))
    BLUE_LIGHT   = BrandColor("Calming Blue",     "#a1c1e6", (161, 193, 230))
    PURPLE       = BrandColor("Classic Purple",   "#a3238e", (163, 35, 142))
    LAVENDER     = BrandColor("Lavender",         "#dd9dc6", (221, 157, 198))
    GREEN        = BrandColor("Grounding Green",  "#1a5a40", (27, 90, 65))
    GREEN_SPRING = BrandColor("Spring Green",     "#d6e040", (214, 224, 64))
    RED          = BrandColor("Brick Red",        "#b04c32", (176, 76, 50))
    WHITE_SOFT   = BrandColor("Soft White",       "#f1eee7", (242, 238, 232))
    BLACK        = BrandColor("Black",            "#231f20", (35, 31, 32))
    WHITE        = BrandColor("White",            "#ffffff", (255, 255, 255))

    # Chart color sequence (in order of use for data series)
    CHART_SEQUENCE = [BLUE, ORANGE, GREEN, PURPLE, YELLOW, BLUE_LIGHT, LAVENDER, GREEN_SPRING, RED]

COLORS = _Colors()


# ============================================================================
# FONTS
# ============================================================================

class _Fonts:
    """Font families and fallbacks."""
    # Primary (Adobe Fonts)
    SERIF = "Mackinac Pro"
    SANS = "Indivisible"

    # Fallbacks (Google Fonts / system)
    SERIF_FALLBACK = "Lora"
    SANS_FALLBACK = "Inter"

    # System fallbacks
    SERIF_SYSTEM = "Georgia"
    SANS_SYSTEM = "Arial"

    # For python-docx / openpyxl (use most-available fallback)
    HEADING_FONT = "Lora"       # Mackinac Pro -> Lora -> Georgia
    BODY_FONT = "Inter"         # Indivisible  -> Inter -> Arial

    # Google Fonts link
    GOOGLE_FONTS_URL = (
        "https://fonts.googleapis.com/css2?"
        "family=Lora:wght@400;500;600;700&"
        "family=Inter:wght@300;400;500;600;700;900&"
        "display=swap"
    )

    # CSS font stacks
    CSS_SERIF = f"'{SERIF}', '{SERIF_FALLBACK}', Georgia, serif"
    CSS_SANS = f"'{SANS}', '{SANS_FALLBACK}', -apple-system, BlinkMacSystemFont, sans-serif"

FONTS = _Fonts()


# ============================================================================
# PPTX HELPERS
# ============================================================================

class _PptxHelpers:
    """Helpers for creating branded PowerPoint presentations."""

    POTX_FILENAME = "Branded-PowerPoint-Template.potx"

    # Layout indices in the branded template
    LAYOUTS = {
        # Title slides
        "title_orange": 0,
        "title_purple": 1,
        "title_green": 2,
        # Content slides
        "one_content": 3,
        "two_content": 4,
        "two_content_highlighted": 5,
        "three_content": 6,
        "three_content_highlighted": 7,
        "four_content": 8,
        "four_content_highlighted": 9,
        "content_and_picture": 10,
        # Divider slides (Blue/Purple/Green x Plain/Radiant/City/Picture)
        "divider_blue_plain": 11,
        "divider_blue_radiant": 12,
        "divider_blue_city": 13,
        "divider_blue_picture": 14,
        "divider_purple_plain": 15,
        "divider_purple_radiant": 16,
        "divider_purple_city": 17,
        "divider_purple_picture": 18,
        "divider_green_plain": 19,
        "divider_green_radiant": 20,
        "divider_green_city": 21,
        "divider_green_picture": 22,
        # Quote slides (Blue/Purple/Green x Plain/City)
        "quote_blue_plain": 23,
        "quote_blue_city": 24,
        "quote_purple_plain": 25,
        "quote_purple_city": 26,
        "quote_green_plain": 27,
        "quote_green_city": 28,
        # End slide
        "end": 29,
    }

    @staticmethod
    def load_template(potx_path: str):
        """Load the branded .potx template as a Presentation object.

        Converts the content type from template to presentation so python-pptx
        can work with it.

        Args:
            potx_path: Path to the .potx file

        Returns:
            pptx.Presentation object
        """
        buf = io.BytesIO()
        with zipfile.ZipFile(potx_path, 'r') as zin:
            with zipfile.ZipFile(buf, 'w') as zout:
                for item in zin.infolist():
                    data = zin.read(item.filename)
                    if item.filename == '[Content_Types].xml':
                        data = data.replace(
                            b'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml',
                            b'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
                        )
                    zout.writestr(item, data)
        buf.seek(0)
        from pptx import Presentation
        return Presentation(buf)

    @staticmethod
    def get_layout(prs, layout_key: str):
        """Get a slide layout by key name.

        Args:
            prs: Presentation object
            layout_key: Key from LAYOUTS dict (e.g. 'title_purple', 'one_content')

        Returns:
            SlideLayout object
        """
        idx = _PptxHelpers.LAYOUTS[layout_key]
        return prs.slide_layouts[idx]

    @staticmethod
    def add_slide(prs, layout_key: str):
        """Add a new slide using a named layout.

        Args:
            prs: Presentation object
            layout_key: Key from LAYOUTS dict

        Returns:
            Slide object
        """
        layout = _PptxHelpers.get_layout(prs, layout_key)
        return prs.slides.add_slide(layout)

    @staticmethod
    def set_placeholder_text(slide, ph_idx: int, text: str):
        """Set text in a placeholder by index, if it exists.

        Args:
            slide: Slide object
            ph_idx: Placeholder index
            text: Text to set

        Returns:
            The placeholder shape, or None if not found
        """
        for ph in slide.placeholders:
            if ph.placeholder_format.idx == ph_idx:
                ph.text = text
                return ph
        return None

pptx_helpers = _PptxHelpers()


# ============================================================================
# DOCX HELPERS
# ============================================================================

class _DocxHelpers:
    """Helpers for creating branded Word documents."""

    @staticmethod
    def setup_document():
        """Create a new Document with brand defaults (fonts, margins, spacing).

        Returns:
            docx.Document with brand styling applied
        """
        from docx import Document
        from docx.shared import Pt, Inches

        doc = Document()

        # Default font
        style = doc.styles['Normal']
        font = style.font
        font.name = FONTS.BODY_FONT   # Inter (Indivisible fallback)
        font.size = Pt(11)
        font.color.rgb = COLORS.BLACK.as_docx_rgb()

        # Narrow margins
        for section in doc.sections:
            section.top_margin = Inches(1)
            section.bottom_margin = Inches(1)
            section.left_margin = Inches(1)
            section.right_margin = Inches(1)

        return doc

    @staticmethod
    def add_heading(doc, text: str, level: int = 1):
        """Add a branded heading.

        Levels:
            0 = Document Title (28pt, Classic Blue, Lora)
            1 = H1 (22pt, Classic Blue, Lora)
            2 = H2 (16pt, Grounding Green, Inter Semibold)
            3 = H3 (13pt, Black, Inter Semibold)

        Args:
            doc: Document object
            text: Heading text
            level: 0-3

        Returns:
            Paragraph object
        """
        from docx.shared import Pt

        HEADING_CONFIG = {
            0: (FONTS.HEADING_FONT, 28, COLORS.BLUE,  False, 24, 12),   # Doc Title
            1: (FONTS.HEADING_FONT, 22, COLORS.BLUE,  False, 24, 12),   # H1
            2: (FONTS.BODY_FONT,    16, COLORS.GREEN,  True, 18,  6),   # H2
            3: (FONTS.BODY_FONT,    13, COLORS.BLACK,  True, 12,  6),   # H3
        }

        font_name, size, color, bold, space_before, space_after = HEADING_CONFIG[level]

        p = doc.add_paragraph()
        run = p.add_run(text)
        run.font.name = font_name
        run.font.size = Pt(size)
        run.font.color.rgb = color.as_docx_rgb()
        run.bold = bold
        p.space_before = Pt(space_before)
        p.space_after = Pt(space_after)
        return p

    @staticmethod
    def add_body(doc, text: str):
        """Add a body paragraph with brand styling.

        Args:
            doc: Document object
            text: Paragraph text

        Returns:
            Paragraph object
        """
        from docx.shared import Pt

        p = doc.add_paragraph()
        run = p.add_run(text)
        run.font.name = FONTS.BODY_FONT
        run.font.size = Pt(11)
        run.font.color.rgb = COLORS.BLACK.as_docx_rgb()
        p.paragraph_format.line_spacing = 1.33
        return p

    @staticmethod
    def add_bullet(doc, text: str):
        """Add a bullet point with brand styling."""
        from docx.shared import Pt

        p = doc.add_paragraph(style='List Bullet')
        p.clear()
        run = p.add_run(text)
        run.font.name = FONTS.BODY_FONT
        run.font.size = Pt(11)
        run.font.color.rgb = COLORS.BLACK.as_docx_rgb()
        return p

    @staticmethod
    def add_branded_table(doc, headers: list, rows: list):
        """Create a fully branded table with header row and alternating colors.

        Args:
            doc: Document object
            headers: List of header strings
            rows: List of lists of cell strings

        Returns:
            Table object
        """
        from docx.shared import Pt, Inches
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement

        table = doc.add_table(rows=1 + len(rows), cols=len(headers))

        # Header row
        for i, header_text in enumerate(headers):
            cell = table.rows[0].cells[i]
            cell.text = header_text
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.color.rgb = COLORS.WHITE.as_docx_rgb()
                    run.font.name = FONTS.BODY_FONT
                    run.font.size = Pt(11)
                    run.bold = True
            shading = OxmlElement('w:shd')
            shading.set(qn('w:fill'), COLORS.BLUE.hex_no_hash)
            shading.set(qn('w:val'), 'clear')
            cell._tc.get_or_add_tcPr().append(shading)

        # Data rows
        for row_idx, row_data in enumerate(rows):
            row = table.rows[row_idx + 1]
            fill_color = COLORS.WHITE_SOFT.hex_no_hash if row_idx % 2 == 0 else COLORS.WHITE.hex_no_hash
            for col_idx, cell_text in enumerate(row_data):
                cell = row.cells[col_idx]
                cell.text = str(cell_text)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = COLORS.BLACK.as_docx_rgb()
                        run.font.name = FONTS.BODY_FONT
                        run.font.size = Pt(11)
                shading = OxmlElement('w:shd')
                shading.set(qn('w:fill'), fill_color)
                shading.set(qn('w:val'), 'clear')
                cell._tc.get_or_add_tcPr().append(shading)

        return table

    @staticmethod
    def add_quote(doc, quote_text: str, attribution: str):
        """Add a branded pull quote with attribution.

        Args:
            doc: Document object
            quote_text: The quote (without quotation marks — they're added automatically)
            attribution: Source attribution text

        Returns:
            Tuple of (quote_paragraph, attribution_paragraph)
        """
        from docx.shared import Pt, Inches

        quote_p = doc.add_paragraph()
        run = quote_p.add_run(f"\u201C{quote_text}\u201D")
        run.font.size = Pt(14)
        run.font.color.rgb = COLORS.BLUE.as_docx_rgb()
        run.font.name = FONTS.HEADING_FONT
        run.italic = True
        quote_p.paragraph_format.left_indent = Inches(0.5)
        quote_p.paragraph_format.right_indent = Inches(0.5)
        quote_p.space_after = Pt(6)

        attrib_p = doc.add_paragraph()
        run = attrib_p.add_run(f"\u2014 {attribution}")
        run.font.size = Pt(11)
        run.font.color.rgb = COLORS.PURPLE.as_docx_rgb()
        run.font.name = FONTS.BODY_FONT
        attrib_p.paragraph_format.left_indent = Inches(0.5)

        return quote_p, attrib_p

docx_helpers = _DocxHelpers()


# ============================================================================
# XLSX HELPERS
# ============================================================================

class _XlsxHelpers:
    """Helpers for creating branded Excel spreadsheets."""

    @staticmethod
    def get_styles():
        """Return a dict of pre-configured openpyxl styles.

        Returns:
            Dict with keys: title_font, header_font, body_font, number_font,
            header_fill, soft_white_fill, white_fill, left_align, light_border,
            and accent fills/fonts for conditional formatting.
        """
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        return {
            # Fonts
            "title_font": Font(name=FONTS.HEADING_FONT, size=16, color=COLORS.BLUE.hex_no_hash),
            "header_font": Font(name=FONTS.BODY_FONT, size=11, bold=True, color=COLORS.WHITE.hex_no_hash),
            "body_font": Font(name=FONTS.BODY_FONT, size=10, color=COLORS.BLACK.hex_no_hash),
            "number_font": Font(name=FONTS.BODY_FONT, size=10, bold=True, color=COLORS.BLUE.hex_no_hash),

            # Fills
            "header_fill": COLORS.BLUE.as_openpyxl_fill(),
            "soft_white_fill": COLORS.WHITE_SOFT.as_openpyxl_fill(),
            "white_fill": COLORS.WHITE.as_openpyxl_fill(),

            # Accent fills
            "green_fill": PatternFill(start_color="e6f2e6", end_color="e6f2e6", fill_type="solid"),
            "orange_fill": PatternFill(start_color="fef0e4", end_color="fef0e4", fill_type="solid"),
            "purple_fill": COLORS.LAVENDER.as_openpyxl_fill(),

            # Accent fonts
            "green_font": Font(name=FONTS.BODY_FONT, size=10, bold=True, color=COLORS.GREEN.hex_no_hash),
            "orange_font": Font(name=FONTS.BODY_FONT, size=10, bold=True, color=COLORS.ORANGE.hex_no_hash),
            "red_font": Font(name=FONTS.BODY_FONT, size=10, bold=True, color=COLORS.RED.hex_no_hash),

            # Alignment
            "left_align": Alignment(horizontal="left", vertical="center"),
            "right_align": Alignment(horizontal="right", vertical="center"),

            # Borders
            "light_border": Border(bottom=Side(style="thin", color="e0dcd6")),
        }

    @staticmethod
    def setup_workbook():
        """Create a new Workbook with brand defaults.

        Returns:
            openpyxl.Workbook
        """
        from openpyxl import Workbook
        return Workbook()

    @staticmethod
    def write_branded_sheet(ws, title: str, headers: list, rows: list,
                            subtitle: str = "", number_cols: list = None):
        """Write a complete branded sheet with title, headers, and data.

        Args:
            ws: Worksheet object
            title: Sheet title (written in row 1)
            headers: List of header strings
            rows: List of lists (each inner list = one row of cell values)
            subtitle: Optional subtitle (written in row 2)
            number_cols: Optional list of 0-based column indices to format as numbers
                         (right-aligned, bold blue)

        Returns:
            The worksheet
        """
        from openpyxl.utils import get_column_letter

        styles = _XlsxHelpers.get_styles()
        number_cols = number_cols or []

        # Title row
        ws.cell(row=1, column=1, value=title).font = styles["title_font"]
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))

        # Subtitle row
        start_row = 2
        if subtitle:
            ws.cell(row=2, column=1, value=subtitle).font = styles["body_font"]
            ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
            start_row = 3

        # Spacer row
        ws.row_dimensions[start_row].height = 6
        start_row += 1

        # Header row
        header_row = start_row
        for col_idx, header_text in enumerate(headers, 1):
            cell = ws.cell(row=header_row, column=col_idx, value=header_text)
            cell.font = styles["header_font"]
            cell.fill = styles["header_fill"]
            cell.alignment = styles["left_align"]
        ws.row_dimensions[header_row].height = 30

        # Data rows
        for row_idx, row_data in enumerate(rows):
            excel_row = header_row + 1 + row_idx
            fill = styles["soft_white_fill"] if row_idx % 2 == 0 else styles["white_fill"]
            for col_idx, value in enumerate(row_data):
                cell = ws.cell(row=excel_row, column=col_idx + 1, value=value)
                if col_idx in number_cols:
                    cell.font = styles["number_font"]
                    cell.alignment = styles["right_align"]
                else:
                    cell.font = styles["body_font"]
                    cell.alignment = styles["left_align"]
                cell.fill = fill
                cell.border = styles["light_border"]
            ws.row_dimensions[excel_row].height = 22

        # Auto-width columns
        for col_idx in range(1, len(headers) + 1):
            max_len = max(
                len(str(ws.cell(row=r, column=col_idx).value or ""))
                for r in range(header_row, header_row + 1 + len(rows))
            )
            ws.column_dimensions[get_column_letter(col_idx)].width = min(max(max_len + 4, 12), 40)

        # Freeze header row
        ws.freeze_panes = ws.cell(row=header_row + 1, column=1).coordinate

        return ws

xlsx_helpers = _XlsxHelpers()


# ============================================================================
# WEB / HTML HELPERS
# ============================================================================

class _WebHelpers:
    """Helpers for generating branded HTML/CSS/React content."""

    @staticmethod
    def css_variables() -> str:
        """Return the complete CSS :root block with all brand variables."""
        return """:root {
  /* Primary */
  --jb-orange: #f36c21;
  --jb-yellow: #faa21b;
  /* Secondary */
  --jb-blue: #2261ae;
  --jb-blue-light: #a1c1e6;
  --jb-purple: #a3238e;
  --jb-lavender: #dd9dc6;
  --jb-green: #1a5a40;
  --jb-green-spring: #d6e040;
  /* Supporting */
  --jb-red: #b04c32;
  --jb-white-soft: #f1eee7;
  --jb-black: #231f20;
  --jb-white: #ffffff;
  /* Semantic */
  --jb-bg: var(--jb-white-soft);
  --jb-bg-card: var(--jb-white);
  --jb-text: var(--jb-black);
  --jb-heading: var(--jb-blue);
  --jb-accent: var(--jb-orange);
  --jb-border: #e0dcd6;
  /* Radii */
  --jb-radius-sm: 8px;
  --jb-radius-md: 14px;
  --jb-radius-lg: 20px;
  --jb-radius-xl: 28px;
}"""

    @staticmethod
    def base_styles() -> str:
        """Return base body and heading styles."""
        return f"""* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
  font-family: {FONTS.CSS_SANS};
  color: var(--jb-text);
  background-color: var(--jb-bg);
  line-height: 1.33;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}}
h1, h2, h3, h4, h5, h6 {{
  font-family: {FONTS.CSS_SERIF};
  color: var(--jb-heading);
  font-weight: 500;
  text-align: left;
}}"""

    @staticmethod
    def component_styles() -> str:
        """Return CSS for common components: cards, tables, buttons, header."""
        return """.jb-card {
  background: var(--jb-bg-card);
  border-radius: var(--jb-radius-lg);
  padding: 24px;
  box-shadow: 0 2px 8px rgba(35,31,32,0.08);
  border: 1px solid var(--jb-border);
}
.jb-header {
  background: var(--jb-white);
  border-bottom: 4px solid var(--jb-orange);
  padding: 32px 48px;
  display: flex; align-items: center; gap: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.jb-header h1 {
  font-size: 28px; color: var(--jb-blue);
}
.jb-header p {
  font-size: 14px; color: var(--jb-black); margin-top: 2px;
}
.jb-table {
  width: 100%; border-collapse: collapse;
}
.jb-table thead { background: var(--jb-blue); }
.jb-table th {
  padding: 16px 24px; text-align: left;
  font-weight: 600; color: white; font-size: 13px;
}
.jb-table tbody tr { border-bottom: 1px solid var(--jb-border); }
.jb-table tbody tr:nth-child(odd) { background: var(--jb-white); }
.jb-table tbody tr:nth-child(even) { background: var(--jb-white-soft); }
.jb-table td { padding: 16px 24px; font-size: 14px; text-align: left; }
.jb-btn-primary {
  background: var(--jb-orange); color: white; border: none;
  border-radius: var(--jb-radius-md); padding: 12px 24px;
  font-weight: 600; font-size: 14px; cursor: pointer;
}
.jb-btn-primary:hover { background: #d95e1a; }
.jb-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px; margin-bottom: 48px;
}
.jb-stat-card {
  background: var(--jb-bg-card); border-radius: var(--jb-radius-lg);
  padding: 28px 32px; box-shadow: 0 2px 8px rgba(35,31,32,0.08);
  border: 1px solid var(--jb-border); text-align: left;
}
.jb-stat-number {
  font-family: """ + FONTS.CSS_SERIF + """;
  font-size: 42px; font-weight: 500; color: var(--jb-heading);
  line-height: 1.1; margin-bottom: 8px;
}
.jb-stat-label { font-size: 14px; color: var(--jb-text); }
.jb-quote {
  background: var(--jb-bg-card); border-radius: var(--jb-radius-lg);
  padding: 36px; box-shadow: 0 2px 8px rgba(35,31,32,0.08);
  border-left: 6px solid var(--jb-purple);
}
.jb-quote blockquote {
  font-family: """ + FONTS.CSS_SERIF + """;
  font-size: 18px; font-style: italic; color: var(--jb-heading);
  line-height: 1.6; margin-bottom: 16px;
}
.jb-quote cite {
  font-family: """ + FONTS.CSS_SANS + """;
  font-size: 13px; font-weight: 600; color: var(--jb-purple);
  font-style: normal;
}"""

    @staticmethod
    def google_fonts_link() -> str:
        """Return the Google Fonts <link> tag."""
        return f'<link href="{FONTS.GOOGLE_FONTS_URL}" rel="stylesheet">'

    @staticmethod
    def full_html_template(title: str = "The Jewish Board", body_content: str = "") -> str:
        """Return a complete HTML page with all brand styles.

        Args:
            title: Page title
            body_content: HTML to insert inside <body>

        Returns:
            Complete HTML string
        """
        css_vars = _WebHelpers.css_variables()
        base = _WebHelpers.base_styles()
        components = _WebHelpers.component_styles()
        fonts_link = _WebHelpers.google_fonts_link()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  {fonts_link}
  <style>
    {css_vars}
    {base}
    {components}
    .main {{ padding: 48px; max-width: 1200px; margin: 0 auto; }}
    .footer {{
      background: var(--jb-white); border-top: 2px solid var(--jb-orange);
      padding: 24px 48px; margin-top: 24px;
      font-size: 13px; color: #888; text-align: left;
    }}
    @media (max-width: 768px) {{
      .main {{ padding: 24px; }}
      .jb-header {{ padding: 24px; }}
      .jb-stats-grid {{ grid-template-columns: 1fr; }}
      .jb-stat-number {{ font-size: 32px; }}
    }}
  </style>
</head>
<body>
{body_content}
</body>
</html>"""

    @staticmethod
    def chart_colors_js() -> str:
        """Return a JS array of chart colors for Chart.js / Recharts."""
        colors = [c.hex for c in COLORS.CHART_SEQUENCE]
        return "const JB_CHART_COLORS = " + str(colors).replace("'", '"') + ";"

web_helpers = _WebHelpers()


# ============================================================================
# CONVENIENCE EXPORTS
# ============================================================================

__all__ = [
    "COLORS", "FONTS",
    "pptx_helpers", "docx_helpers", "xlsx_helpers", "web_helpers",
]
