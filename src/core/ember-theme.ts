/** Ember glass: shared report foundations, mirrored into the website by its explicit
 * sync-report-theme script. Brand color is decorative; severity and evidence labels
 * retain their separate semantics. All report assets remain offline and inline. */
export const EMBER_FOUNDATIONS_CSS = `
:root {
  --ember-aubergine: #1e0e26;
  --ember-surface: #2c1835;
  --ember-ink: #fbf3ff;
  --ember-muted: #c5b3cd;
  --ember-line: #624b6c;
  --ember-orange: #ff743d;
  --ember-purple: #9a74ed;
  --ember-lilac: #b9a0ff;
  --ember-focus: #e2ceff;
  --ember-action-text: #24102b;
  --ember-action: linear-gradient(115deg, var(--ember-lilac) 0%, var(--ember-purple) 42%, var(--ember-orange) 100%);
  --ember-glass: linear-gradient(135deg, #ffffff12, #ffffff02 48%), radial-gradient(ellipse at 100% 0%, #ff743d18, transparent 65%);
  --ember-glass-shadow: inset 0 1px 0 #ffffff26, 0 16px 40px -24px #10061780;
}
`;

// Screen-only presentation leaves the established monochrome print stylesheet in control.
export const EMBER_REPORT_CSS = `${EMBER_FOUNDATIONS_CSS}
@media screen {
  body {
    --bg: var(--ember-aubergine); --paper: var(--ember-aubergine);
    --card: var(--ember-surface); --surface: var(--ember-surface);
    --ink: var(--ember-ink); --muted: var(--ember-muted); --line: var(--ember-line);
    --accent: var(--ember-lilac); --accent-2: #ffb38f; --focus: var(--ember-focus);
    --bg: #0b0913; --paper: #0b0913; --card: #151120; --surface: #151120; --line: #2e283c; --muted: #b4abc4;
    --tint: #211b30; --deep: #110e19; --code: #120f1b;
    --art-warm: var(--ember-orange); --art-mid: var(--ember-lilac); --art-cool: var(--ember-purple);
    --gradient: linear-gradient(115deg,var(--accent),var(--accent-2));
    --rail-bg: #110e19; --rail-line: #2e283c; --rail-muted: var(--ember-muted);
    background-image: radial-gradient(ellipse 65% 620px at 90% -180px,#a98cff0d,transparent);
  }
  :root[data-theme=light] body {
    --bg: #f6f5f9; --paper: #f6f5f9; --card: #ffffff; --surface: #ffffff;
    --ink: #1a1424; --muted: #5d566c; --line: #e2deea;
    --accent: #5b3fb0; --accent-2: #b4481d; --focus: #5b3fb0;
    --tint: #eeeaf8; --deep: var(--ember-aubergine); --code: #f1eff6;
    --ember-glass: linear-gradient(160deg, #ffffff, #ffffff00 55%), radial-gradient(ellipse at 100% 0%, #a98cff14, transparent 65%);
    --ember-glass-shadow: 0 1px 2px #1a142410, 0 18px 40px -28px #1a142440;
    background-image: none;
  }
  .cta, .button.primary {
    background: linear-gradient(138deg,#cdbbff 5%,#a98cff 31%,#e97a97 66%,#f2682c 86%); color: var(--ember-action-text);
    border: 1px solid #ffffff4d; border-radius: 8px;
    box-shadow: inset 0 1px 0 #ffffff8c, inset 0 -1px 0 #1a0f1f2e, 0 1px 2px #0003, 0 10px 28px -16px #f2682c96;
    text-shadow: none;
  }
  :root[data-theme=dark] .button.primary { color: var(--ember-action-text); }
  .cta:hover, .button.primary:hover { filter: brightness(1.07); }
  .cover-band, [data-kind=judgement], .delivery-overview {
    background: var(--ember-glass), var(--card,var(--surface));
    border: 1px solid var(--line); box-shadow: var(--ember-glass-shadow);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  .rail { background-image: radial-gradient(ellipse at 0 100%,#9a74ed20,transparent 60%); }
  .rail a[aria-current=true] { background: linear-gradient(135deg,#ffffff12,#ffffff02 48%),#ffffff0a; box-shadow: inset 0 1px 0 #ffffff1a; }
  .toolbar { opacity: 1; }
  .cover-art { border-radius: 14px; border: 1px solid #b9a0ff40; background: var(--ember-glass),var(--card); mask-image: none; -webkit-mask-image: none; box-shadow: var(--ember-glass-shadow); }
  :root[data-theme=light] .cover-band { color: var(--ink); background: var(--ember-glass),var(--card); }
  :root[data-theme=light] .cover-band .lead { color: var(--muted); }
  :focus-visible { outline-color: var(--focus); }
}
@media screen and (max-width:680px) {
  .cover, .deck-section { overflow-wrap:anywhere; }
  table.assess { display:block; max-width:100%; overflow-x:auto; }
  #limits ul { grid-template-columns:minmax(0,1fr); }
}
@media screen and (prefers-color-scheme:light) {
  :root:not([data-theme=dark]) body {
    --bg:#f6f5f9; --paper:#f6f5f9; --card:#ffffff; --surface:#ffffff;
    --ink:#1a1424; --muted:#5d566c; --line:#e2deea;
    --accent:#5b3fb0; --accent-2:#b4481d; --focus:#5b3fb0;
    --tint:#eeeaf8; --deep:var(--ember-aubergine); --code:#f1eff6;
    --ember-glass:linear-gradient(160deg,#ffffff,#ffffff00 55%),radial-gradient(ellipse at 100% 0%,#a98cff14,transparent 65%);
    --ember-glass-shadow:0 1px 2px #1a142410,0 18px 40px -28px #1a142440;
    background-image:none;
  }
  :root:not([data-theme=dark]) .cover-band { color:var(--ink); background:var(--ember-glass),var(--card); }
  :root:not([data-theme=dark]) .cover-band .lead { color:var(--muted); }
}
`;
