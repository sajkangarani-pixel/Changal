export function renderArtwork(game, className = "") {
  const art = game.artwork || { a: "#d0ff4f", b: "#59663a", c: "#171916", motif: "spark" };
  const label = game.imageAlt || `${game.title} game cover`;

  return `
    <div
      class="cover-art ${className}"
      role="img"
      aria-label="${escapeHtml(label)}"
      style="--art-a:${art.a}; --art-b:${art.b}; --art-c:${art.c};"
      data-motif="${escapeHtml(art.motif)}"
    >
      ${
        game.imageUrl
          ? `<img class="cover-art-image" src="${escapeHtml(game.imageUrl)}" alt="${escapeHtml(label)}" loading="lazy" />`
          : `
            <span class="art-orbit art-orbit-one"></span>
            <span class="art-orbit art-orbit-two"></span>
            <span class="art-glyph">${renderMotif(art.motif)}</span>
            <span class="art-noise"></span>
          `
      }
    </div>
  `;
}

function renderMotif(motif) {
  const motifs = {
    mask: '<svg viewBox="0 0 120 120"><path d="M20 54c9-18 71-18 80 0-6 28-22 42-40 42S26 82 20 54z"/><circle cx="46" cy="58" r="8"/><circle cx="74" cy="58" r="8"/><path d="M47 79c8 5 18 5 26 0"/></svg>',
    door: '<svg viewBox="0 0 120 120"><path d="M34 100V24h52v76"/><path d="M48 100V36l28 8v56"/><circle cx="68" cy="68" r="3"/></svg>',
    moon: '<svg viewBox="0 0 120 120"><path d="M78 18a42 42 0 1 0 24 66A46 46 0 0 1 78 18z"/><circle cx="38" cy="54" r="4"/><circle cx="53" cy="75" r="3"/></svg>',
    question: '<svg viewBox="0 0 120 120"><path d="M42 43c3-17 36-20 40 0 3 14-9 21-18 27-6 4-7 9-7 14"/><circle cx="58" cy="98" r="5"/></svg>',
    pulse: '<svg viewBox="0 0 120 120"><path d="M16 64h20l10-28 18 58 12-30h28"/></svg>',
    eye: '<svg viewBox="0 0 120 120"><path d="M14 60s16-28 46-28 46 28 46 28-16 28-46 28-46-28-46-28z"/><circle cx="60" cy="60" r="16"/></svg>',
    lava: '<svg viewBox="0 0 120 120"><path d="M18 84c14-10 20 10 34 0s20-10 34 0 20 3 26-4"/><path d="M38 72c6-20 18-18 16-44 17 17 28 30 20 58"/></svg>',
    chat: '<svg viewBox="0 0 120 120"><path d="M22 30h76v48H52L34 94V78H22z"/><path d="M38 48h44M38 62h28"/></svg>',
    letters: '<svg viewBox="0 0 120 120"><path d="M28 90 46 30h12l18 60"/><path d="M36 68h32"/><path d="M84 34v56"/></svg>',
    pencil: '<svg viewBox="0 0 120 120"><path d="M28 88 82 34l14 14-54 54-20 6z"/><path d="m75 41 14 14"/></svg>',
    cards: '<svg viewBox="0 0 120 120"><rect x="42" y="20" width="42" height="62" rx="8"/><rect x="30" y="36" width="42" height="62" rx="8"/><path d="M47 58c6-8 14-8 20 0"/></svg>',
    music: '<svg viewBox="0 0 120 120"><path d="M44 80V28l42-8v52"/><circle cx="34" cy="84" r="12"/><circle cx="76" cy="76" r="12"/></svg>',
    paper: '<svg viewBox="0 0 120 120"><path d="M32 18h40l18 18v66H32z"/><path d="M72 18v20h18"/><path d="M46 58h28M46 72h22"/></svg>',
    grid: '<svg viewBox="0 0 120 120"><rect x="24" y="24" width="28" height="28" rx="5"/><rect x="68" y="24" width="28" height="28" rx="5"/><rect x="24" y="68" width="28" height="28" rx="5"/><rect x="68" y="68" width="28" height="28" rx="5"/></svg>',
    tiles: '<svg viewBox="0 0 120 120"><path d="M30 30h24v24H30zM66 30h24v24H66zM30 66h24v24H30zM66 66h24v24H66z"/></svg>',
    dice: '<svg viewBox="0 0 120 120"><rect x="30" y="30" width="60" height="60" rx="14"/><circle cx="46" cy="46" r="5"/><circle cx="74" cy="74" r="5"/><circle cx="74" cy="46" r="5"/><circle cx="46" cy="74" r="5"/></svg>',
    bolt: '<svg viewBox="0 0 120 120"><path d="M66 14 30 66h28l-4 40 38-56H64z"/></svg>',
    brush: '<svg viewBox="0 0 120 120"><path d="M78 20 42 58"/><path d="M38 62c-16 8-12 30-28 34 20 4 36-3 42-18 4-10-4-22-14-16z"/></svg>',
    radar: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="36"/><circle cx="60" cy="60" r="12"/><path d="M60 60 92 32"/></svg>',
    maze: '<svg viewBox="0 0 120 120"><path d="M24 24h72v72H24z"/><path d="M42 24v30h18v42"/><path d="M78 24v18H60"/><path d="M42 72H24"/><path d="M78 96V66h18"/></svg>',
    camera: '<svg viewBox="0 0 120 120"><rect x="22" y="34" width="76" height="54" rx="12"/><path d="m42 34 8-12h20l8 12"/><circle cx="60" cy="61" r="16"/></svg>',
    trophy: '<svg viewBox="0 0 120 120"><path d="M42 24h36v22c0 20-8 32-18 32S42 66 42 46z"/><path d="M42 32H24c0 18 7 28 20 30"/><path d="M78 32h18c0 18-7 28-20 30"/><path d="M60 78v18M44 96h32"/></svg>'
  };
  return motifs[motif] || motifs.bolt;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
