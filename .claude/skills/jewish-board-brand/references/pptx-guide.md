# PowerPoint Presentation Guide — The Jewish Board

## Template

The branded template is at `assets/Branded-PowerPoint-Template.potx`. This is a .potx file
(PowerPoint template format). To use it with python-pptx, you need to fix the content type:

```python
import zipfile

def load_potx_as_pptx(potx_path):
    """Convert .potx content type so python-pptx can read it."""
    import io
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
```

## Slide Dimensions
- Width: 13.33 inches (widescreen 16:9)
- Height: 7.5 inches

## Available Slide Layouts

The template includes 30 layouts organized into categories:

### Title Slides (idx 0–2)
| Layout Name         | Theme   | Key Placeholders                    |
|---------------------|---------|-------------------------------------|
| Title Slide         | Orange  | Title (0), Subtitle (1), Body (10–15) |
| Title Slide Purple  | Purple  | Title (0), Subtitle (1), Body (10–15) |
| Title Slide Green   | Green   | Title (0), Subtitle (1), Body (10–15) |

### Content Slides (idx 3–10)
| Layout Name                  | Placeholders                                    |
|------------------------------|------------------------------------------------|
| One Content                  | Title (0), Content (12), Footer (10), SlideNum (11) |
| Two Content                  | Title (0), Content (12, 13), Footer, SlideNum   |
| Two Content Highlighted      | Title (0), Body (14, 15), Footer, SlideNum      |
| Three Content                | Title (0), Content (12, 13, 14), Footer, SlideNum |
| Three Content Highlighted    | Title (0), Body (15, 16, 17), Footer, SlideNum  |
| Four Content                 | Title (0), Content (12, 13, 15, 16), Footer, SlideNum |
| Four Content Highlighted     | Title (0), Content (12, 13, 15, 16), Footer, SlideNum |
| Content and Picture          | Title (0), Content (12), Picture (14), Footer, SlideNum |

### Divider Slides (idx 11–22)
Available in Blue, Purple, and Green, with variants: Plain, Radiant, City, and Picture.
| Variant  | Description                                    |
|----------|------------------------------------------------|
| Plain    | Solid color background with text               |
| Radiant  | Background with The Radiant starburst motif    |
| City     | Background with NYC cityscape illustration     |
| Picture  | Half color / half photo with Picture placeholder (13) |

All divider slides have: Body text (10), Footer (11), SlideNum (12).

### Quote Slides (idx 23–28)
Available in Blue, Purple, and Green, with variants: Plain and City.
All quote slides have: Quote text (13), Attribution (14), Body (10), Footer (11), SlideNum (12).

### End Slide (idx 29)
| Layout Name | Placeholders                              |
|-------------|-------------------------------------------|
| End Slide   | Title (0), Body (11, 12, 13, 14)         |

## Design Rules for Presentations

### Layout Selection
- Start with a Title Slide (choose color theme: Orange, Purple, or Green)
- Use Divider slides to separate major sections
- Use Quote slides for testimonials, impact statements, or key messages
- End with the End Slide
- Mix content layouts based on the information density of each slide

### Typography in Slides
- Slide titles: Mackinac Pro Medium (already set in template)
- Body text: Indivisible Regular (already set in template), Semibold for emphasis
- If fonts aren't available in the system, the template's embedded fonts will carry through
- All text is left-aligned — do not center text
- Never use all caps in Mackinac — all-caps is only for Indivisible Black section headings
- Use curly (typographer's) quotes, never straight quotes

### Color Usage
- Each presentation should pick a primary color theme (Blue, Purple, or Green) and use it consistently for dividers and quotes
- Content slides use a white/light background with brand-colored accents
- Use Sunshine Orange sparingly as a highlight — it's the logo color, not a background color
- Data visualizations should use the full brand palette
- Do not use tints of brand colors or any off-brand colors

### Content Guidelines
- Keep slides clean and uncluttered — favor fewer words and more visual impact
- One key message per slide
- Use rounded-corner shapes for content containers and image frames
- Photos should fill their containers or be placed in rounded frames
- Charts and graphs should use brand colors exclusively
