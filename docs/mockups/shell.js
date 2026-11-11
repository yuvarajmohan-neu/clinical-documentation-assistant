// Shared mockup helpers: inline SVG icons (<i data-ic="name">) and the app header (<div id="app-header" data-nav="...">).
const ICONS = {
  critical: '<path d="M8.2 2h7.6L22 8.2v7.6L15.8 22H8.2L2 15.8V8.2z" fill="currentColor" stroke="none" opacity="0"/><path d="M8.2 2h7.6L22 8.2v7.6L15.8 22H8.2L2 15.8V8.2z"/><path d="M12 7v6"/><circle cx="12" cy="16.6" r=".6" fill="currentColor"/>',
  warning: '<path d="M12 3 2 20.5h20z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/>',
  check: '<circle cx="12" cy="12" r="9.5"/><path d="m7.5 12.3 3 3 6-6.3"/>',
  tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  record: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8M12 7.5V12l3 2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  pen: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
};

function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function header(nav) {
  const item = (key, label) => `<a class="${nav === key ? "on" : ""}">${label}</a>`;
  return `
  <header class="header">
    <div class="brand"><span class="org">The Jewish Board</span><span class="app">Clinical Documentation Assistant</span></div>
    <nav class="nav">${item("setup", "Session setup")}${item("write", "Write a note")}${item("check", "Check a note")}</nav>
    <div class="right">
      <span class="chip-program">${icon("lock")} Article 31 Outpatient Clinic</span>
      <span class="badge-demo">Synthetic data – demo only</span>
      <span class="user"><span class="avatar">DC</span><span>Demo Clinician<br><span class="signout">Sign out</span></span></span>
    </div>
  </header>`;
}

document.querySelectorAll("#app-header").forEach((el) => (el.outerHTML = header(el.dataset.nav)));
document.querySelectorAll("i[data-ic]").forEach((el) => (el.outerHTML = icon(el.dataset.ic)));
