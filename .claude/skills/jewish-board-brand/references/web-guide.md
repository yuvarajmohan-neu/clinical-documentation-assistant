# Web App & Dashboard Guide — The Jewish Board

## CSS Foundation

Every web output should start with these CSS custom properties and base styles.
Copy this into your stylesheet or `<style>` block:

```css
:root {
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

  /* Radii — the rounded-frame signature */
  --jb-radius-sm: 8px;
  --jb-radius-md: 14px;
  --jb-radius-lg: 20px;
  --jb-radius-xl: 28px;
}

body {
  font-family: 'Indivisible', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--jb-text);
  background-color: var(--jb-bg);
  line-height: 1.33;
  letter-spacing: -0.01em; /* approximation of -20 tracking */
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Mackinac Pro', 'Lora', Georgia, serif;
  color: var(--jb-heading);
  font-weight: 500; /* Medium */
  text-align: left; /* Never center text */
}
```

## Google Fonts Import

Include at the top of HTML files or in the `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
```

For React JSX files, include in the component or index.html.

Note: Lora is the Google Font fallback for Mackinac Pro (serif headlines).
Inter is the Google Font fallback for Indivisible (sans-serif body text).
Inter weight 900 (Black) can be used for section labels in all caps.

## Component Patterns

### Cards (the rounded-frame pattern)
```css
.jb-card {
  background: var(--jb-bg-card);
  border-radius: var(--jb-radius-lg);
  padding: 24px;
  box-shadow: 0 2px 8px rgba(35, 31, 32, 0.08);
  border: 1px solid var(--jb-border);
}
```

### Buttons
```css
.jb-btn-primary {
  background: var(--jb-orange);
  color: white;
  border: none;
  border-radius: var(--jb-radius-md);
  padding: 12px 24px;
  font-family: 'Indivisible', 'Inter', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.jb-btn-primary:hover {
  background: #d95e1a; /* slightly darker orange */
}

.jb-btn-secondary {
  background: var(--jb-blue);
  color: white;
  border: none;
  border-radius: var(--jb-radius-md);
  padding: 12px 24px;
  font-family: 'Indivisible', 'Inter', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
```

### Navigation / Header
```css
.jb-header {
  background: var(--jb-white);
  border-bottom: 2px solid var(--jb-orange);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}
```

### Data Tables
```css
.jb-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: var(--jb-radius-md);
  overflow: hidden;
  text-align: left; /* All text left-aligned */
}
.jb-table thead th {
  background: var(--jb-blue);
  color: white;
  padding: 12px 16px;
  text-align: left;
  font-family: 'Indivisible', 'Inter', sans-serif;
  font-weight: 600;
}
.jb-table tbody tr:nth-child(even) {
  background: var(--jb-white-soft);
}
.jb-table tbody td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--jb-border);
}
```

### Charts (Recharts / Chart.js)
Use this color sequence for data series:
1. `#2261ae` (Classic Blue)
2. `#f36c21` (Sunshine Orange)
3. `#1a5a40` (Grounding Green)
4. `#a3238e` (Classic Purple)
5. `#faa21b` (Cab Yellow)
6. `#a1c1e6` (Calming Blue)
7. `#dd9dc6` (Lavender)
8. `#d6e040` (Spring Green)
9. `#b04c32` (Brick Red)

Do not use tints of these colors or any off-brand colors in charts.

### Images
```css
.jb-img {
  border-radius: var(--jb-radius-lg);
  object-fit: cover;
}
```

## Layout Principles

- Use generous whitespace — the brand is open and breathing, not cramped
- Maximum content width: 1200px, centered
- Cards and content blocks always have rounded corners (var(--jb-radius-lg) minimum)
- Backgrounds: Soft White for the page, White for cards/panels — this creates subtle depth
- Accent colors (Orange, Blue) for interactive elements and highlights
- Use the full color palette for dashboards and data visualization — the brand is colorful
- **All text is left-aligned** — do not center headings or body text
- Keep line lengths to 75 characters max for readability

## Typography Rules for Web

- Headlines: Mackinac Pro / Lora, Medium weight (500), brand color
- Body: Indivisible / Inter, Regular weight (400), Black (#231f20)
- Emphasis: Indivisible / Inter, Semibold weight (600)
- Section labels (optional): Indivisible Black / Inter Black (900), ALL CAPS, 20–25% smaller than body
- Never use all caps in Mackinac / Lora
- Never make Indivisible / Inter oversized for headlines — keep it for body/small text
- Line height: 1.33 (133%)
- Letter spacing: -0.01em for body text
- Use curly (typographer's) quotes — set `text-rendering: optimizeLegibility` to help

## React-Specific Notes

When building React components (.jsx):
- Use Tailwind utility classes where available, but apply brand colors via inline styles or CSS variables
- For border-radius, use `rounded-2xl` (Tailwind) or `style={{ borderRadius: '20px' }}`
- Background colors: `bg-[#f1eee7]` for page, `bg-white` for cards
- Text color: `text-[#231f20]` for body, `text-[#2261ae]` for headings
- Text alignment: `text-left` always — never use `text-center` for headings or body
- Include the Google Fonts link in the document head or import via CSS

## Accessibility
- Maintain WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text)
- Sunshine Orange (#f36c21) on white passes for large text only — use it for buttons/headings, not small body text
- Classic Blue (#2261ae) on white passes AA for all text sizes
- Black (#231f20) on Soft White (#f1eee7) passes AA for all text sizes
- Grounding Green (#1a5a40) on white passes AA for all text sizes
- Always provide text alternatives for images and icons
