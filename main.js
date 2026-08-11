/* ═══════════════════════════════════════════════════════════════
   GETFLIX — main.js (homepage)
   ▸ API gratuita: The Movie Database (TMDB)
   +++ Ctrl+K para pesquisa | Parallax no herói | Setas nas rows
   +++ Overlay no menu mobile (escurece o fundo)
   +++ Gestão centralizada de anúncios (AdManager)
═══════════════════════════════════════════════════════════════ */

// ── IMPORTAÇÕES ──────────────────────────────────────────────
import AdManager from './js/adManager.js';

// ── CONFIGURAÇÃO ──────────────────────────────────────────────
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
if (!TMDB_KEY) {
  console.error("❌ TMDB_KEY não definida! Crie um arquivo .env com VITE_TMDB_KEY=sua_chave");
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_W500  = "https://image.tmdb.org/t/p/w500";
const IMG_HERO  = "https://image.tmdb.org/t/p/w1280";

// ── ESTADO ────────────────────────────────────────────────────
let heroItems = [], heroIdx = 0, heroTimer;

// ── UTILS ─────────────────────────────────────────────────────
async function api(path, params = {}) {
  const u = new URL(`${TMDB_BASE}${path}`);
  u.searchParams.set("api_key", TMDB_KEY);
  u.searchParams.set("language", "pt-BR");
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const posterSrc = p => p
  ? `${IMG_W500}${p}`
  : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='255' viewBox='0 0 170 255'%3E%3Crect fill='%231a1a1a' width='170' height='255'/%3E%3Ctext fill='%23333' font-size='48' font-family='sans-serif' x='85' y='140' text-anchor='middle'%3E%3F%3C/text%3E%3C/svg%3E`;

const title   = i => i.title || i.name || "Sem título";
const year    = i => (i.release_date || i.first_air_date || "").slice(0, 4) || "—";
const typeOf  = i => i.media_type || (i.first_air_date ? "tv" : "movie");
const typeLabel = t => ({ movie: "Filme", tv: "Série", person: "" }[t] || "");

// ── HEADER SCROLL ─────────────────────────────────────────────
const hdr = document.getElementById("header");
window.addEventListener("scroll", () => hdr.classList.toggle("scrolled", scrollY > 20), { passive: true });

// ── MOBILE MENU TOGGLE ────────────────────────────────────────
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const menuOverlay = document.getElementById("menuOverlay");

menuToggle.addEventListener("click", () => {
  mainNav.classList.toggle("open");
  menuOverlay.classList.toggle("active");
  const expanded = mainNav.classList.contains("open");
  menuToggle.setAttribute("aria-expanded", expanded);
  menuToggle.setAttribute("aria-label", expanded ? "Fechar menu" : "Abrir menu");
});

menuOverlay.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuOverlay.classList.remove("active");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
});

document.addEventListener("click", (e) => {
  if (!mainNav.contains(e.target) && !menuToggle.contains(e.target) && mainNav.classList.contains("open")) {
    mainNav.classList.remove("open");
    menuOverlay.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 960 && mainNav.classList.contains("open")) {
    mainNav.classList.remove("open");
    menuOverlay.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }
});

// ── SEARCH ────────────────────────────────────────────────────
const overlay = document.getElementById("searchOverlay");
const sinput  = document.getElementById("searchInput");
const sres    = document.getElementById("searchResults");
let stimer;

document.getElementById("searchToggle").addEventListener("click", () => {
  overlay.classList.add("open");
  setTimeout(() => sinput.focus(), 80);
});

const closeSearch = () => {
  overlay.classList.remove("open");
  sinput.value = "";
  sres.innerHTML = "";
};
document.getElementById("searchClose").addEventListener("click", closeSearch);
document.addEventListener("keydown", e => e.key === "Escape" && closeSearch());

sinput.addEventListener("input", () => {
  clearTimeout(stimer);
  const q = sinput.value.trim();
  if (q.length < 2) { sres.innerHTML = ""; return; }
  stimer = setTimeout(() => doSearch(q), 380);
});

async function doSearch(q) {
  sres.innerHTML = `<p class="srch-empty">A pesquisar…</p>`;
  try {
    const d = await api("/search/multi", { query: q, include_adult: false });
    sres.innerHTML = "";
    const items = (d.results || []).filter(i => i.poster_path && i.media_type !== "person");
    if (!items.length) { sres.innerHTML = `<p class="srch-empty">Sem resultados para "${q}"</p>`; return; }
    items.slice(0, 24).forEach(i => sres.appendChild(makeCard(i)));
  } catch {
    sres.innerHTML = `<p class="srch-empty">Erro na pesquisa. Verifique a chave da API.</p>`;
  }
}

// ── CARD ──────────────────────────────────────────────────────
function makeCard(item) {
  const t = title(item), y = year(item), tp = typeOf(item);
  const score = item.vote_average ? item.vote_average.toFixed(1) : null;
  const div = document.createElement("div");
  div.className = "mc";
  
  // ── ATRIBUTOS DATA PARA IDENTIFICAÇÃO ──
  div.dataset.id = item.id;
  div.dataset.type = tp;
  div.dataset.title = t;
  
  div.innerHTML = `
    <img class="mc-poster" src="${posterSrc(item.poster_path)}" alt="${t}" loading="lazy">
    <div class="mc-veil"><div class="mc-play">▶</div></div>
    <div class="mc-body">
      <div class="mc-title">${t}</div>
      <div class="mc-meta">
        <span>${y}</span>
        ${score ? `<span class="mc-star">★ ${score}</span>` : ""}
      </div>
    </div>`;
  
  // ── USAR onclick EM VEZ DE addEventListener ──
  div.onclick = function(event) {
    console.log('🔘 [Smartlink] Clique no card:', this.dataset.title);
    
    // ✅ Abrir Smartlink (gerido pelo AdManager)
    AdManager.openSmartlink();
    
    // ✅ Continuar para o player (sempre abre)
    window.location.href = `player.html?id=${item.id}&type=${tp}`;
  };
  
  return div;
}

// ── HERO ──────────────────────────────────────────────────────
function renderHero(item) {
  const tp = typeOf(item), t = title(item), y = year(item);
  const score = item.vote_average ? item.vote_average.toFixed(1) : null;
  document.getElementById("heroBd").style.backgroundImage =
    item.backdrop_path ? `url(${IMG_HERO}${item.backdrop_path})` : "none";
  document.getElementById("heroTitle").textContent = t;
  document.getElementById("heroDesc").textContent = item.overview || "";
  document.getElementById("heroTags").innerHTML = `
    <span class="tag tag-type">${typeLabel(tp)}</span>
    ${score ? `<span class="tag tag-score">★ ${score}</span>` : ""}
  `;
  document.getElementById("heroMeta").innerHTML = `
    <span>${y}</span>
    ${item.vote_count ? `<span class="sep"></span><span>${item.vote_count.toLocaleString()} votos</span>` : ""}
    ${item.original_language ? `<span class="sep"></span><span>${item.original_language.toUpperCase()}</span>` : ""}
  `;
  document.getElementById("heroActs").innerHTML = `
    <a href="player.html?id=${item.id}&type=${tp}" class="btn-play">▶ Assistir Agora</a>
    <a href="player.html?id=${item.id}&type=${tp}" class="btn-info">ℹ Detalhes</a>
  `;
}

function buildDots() {
  const el = document.getElementById("heroDots");
  el.innerHTML = "";
  heroItems.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "hdot" + (i === heroIdx ? " on" : "");
    b.addEventListener("click", () => goHero(i));
    b.setAttribute("aria-label", `Slide ${i+1}`);
    el.appendChild(b);
  });
}

function goHero(i) {
  heroIdx = i;
  renderHero(heroItems[heroIdx]);
  buildDots();
  resetTimer();
}

function resetTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goHero((heroIdx + 1) % heroItems.length), 7000);
}

document.getElementById("heroPrev").addEventListener("click", () => goHero((heroIdx - 1 + heroItems.length) % heroItems.length));
document.getElementById("heroNext").addEventListener("click", () => goHero((heroIdx + 1) % heroItems.length));

// ── ROW BUILDER ──────────────────────────────────────────────
function makeRow(rowTitle, items) {
  const visible = (items || []).filter(i => i.poster_path);
  if (!visible.length) return null;
  const wrapper = document.createElement("div");
  wrapper.className = "row-wrapper";
  const container = document.createElement("div");
  container.className = "row-scroll-container";
  const scroll = document.createElement("div");
  scroll.className = "row-scroll";
  visible.slice(0, 20).forEach(i => scroll.appendChild(makeCard(i)));
  container.appendChild(scroll);
  const leftArrow = document.createElement("button");
  leftArrow.className = "row-arrow left";
  leftArrow.innerHTML = "‹";
  leftArrow.setAttribute("aria-label", "Rolar para esquerda");
  const rightArrow = document.createElement("button");
  rightArrow.className = "row-arrow right";
  rightArrow.innerHTML = "›";
  rightArrow.setAttribute("aria-label", "Rolar para direita");
  wrapper.appendChild(leftArrow);
  wrapper.appendChild(container);
  wrapper.appendChild(rightArrow);
  const row = document.createElement("div");
  row.className = "c-row";
  row.innerHTML = `<div class="row-hdr"><h2 class="row-title">${rowTitle}</h2></div>`;
  row.appendChild(wrapper);
  setTimeout(() => initRowArrows(), 50);
  return row;
}

function initRowArrows() {
  document.querySelectorAll(".row-wrapper").forEach(wrapper => {
    const container = wrapper.querySelector(".row-scroll");
    const leftBtn = wrapper.querySelector(".row-arrow.left");
    const rightBtn = wrapper.querySelector(".row-arrow.right");
    if (!container || !leftBtn || !rightBtn) return;
    const scrollAmount = 300;
    leftBtn.addEventListener("click", () => {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
    rightBtn.addEventListener("click", () => {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
    const updateArrows = () => {
      const left = container.scrollLeft;
      const maxLeft = container.scrollWidth - container.clientWidth;
      leftBtn.style.opacity = left > 10 ? "1" : "0.3";
      leftBtn.style.pointerEvents = left > 10 ? "auto" : "none";
      rightBtn.style.opacity = left < maxLeft - 10 ? "1" : "0.3";
      rightBtn.style.pointerEvents = left < maxLeft - 10 ? "auto" : "none";
    };
    container.addEventListener("scroll", updateArrows);
    setTimeout(updateArrows, 100);
  });
}

function makeSkel(cols = 8) {
  const row = document.createElement("div");
  row.className = "skel-row";
  for (let i = 0; i < cols; i++) {
    const c = document.createElement("div");
    c.className = "skel-card";
    row.appendChild(c);
  }
  return row;
}

// ── CATEGORIES ────────────────────────────────────────────────
const CATS = {
  all: async () => {
    const [tmov, ttv, pmov, ptv, topM, topT, newM] = await Promise.all([
      api("/trending/movie/week"),
      api("/trending/tv/week"),
      api("/movie/popular"),
      api("/tv/popular"),
      api("/movie/top_rated"),
      api("/tv/top_rated"),
      api("/movie/now_playing"),
    ]);
    return [
      { t: "🔥 Em Destaque — Filmes",        d: tmov.results  },
      { t: "📺 Em Alta — Séries",             d: ttv.results   },
      { t: "🎬 Filmes Mais Populares",        d: pmov.results  },
      { t: "🌟 Séries Mais Populares",        d: ptv.results   },
      { t: "⭐ Filmes Mais Bem Avaliados",    d: topM.results  },
      { t: "🏆 Séries Mais Bem Avaliadas",   d: topT.results  },
      { t: "🆕 Em Cartaz",                    d: newM.results  },
    ];
  },
  movie: async () => {
    const [pop, top, new_, up] = await Promise.all([
      api("/movie/popular"),
      api("/movie/top_rated"),
      api("/movie/now_playing"),
      api("/movie/upcoming"),
    ]);
    return [
      { t: "🎬 Filmes Populares",     d: pop.results },
      { t: "⭐ Mais Bem Avaliados",   d: top.results },
      { t: "🆕 Em Cartaz",            d: new_.results },
      { t: "📅 Em Breve",             d: up.results  },
    ];
  },
  tv: async () => {
    const [pop, top, air, rated] = await Promise.all([
      api("/tv/popular"),
      api("/tv/top_rated"),
      api("/tv/on_the_air"),
      api("/discover/tv", { sort_by: "vote_count.desc", "vote_count.gte": 1000 }),
    ]);
    return [
      { t: "📺 Séries Populares",           d: pop.results   },
      { t: "🏆 Mais Bem Avaliadas",         d: top.results   },
      { t: "📡 No Ar Agora",                d: air.results   },
      { t: "💎 Aclamadas pelo Público",     d: rated.results },
    ];
  },
  anime: async () => {
    const [aTv1, aTv2, aM] = await Promise.all([
      api("/discover/tv",    { with_genres: "16", sort_by: "popularity.desc", with_original_language: "ja" }),
      api("/discover/tv",    { with_genres: "16", sort_by: "vote_average.desc", "vote_count.gte": 500, with_original_language: "ja" }),
      api("/discover/movie", { with_genres: "16", sort_by: "popularity.desc",  with_original_language: "ja" }),
    ]);
    return [
      { t: "🎌 Anime — Tendências",         d: aTv1.results },
      { t: "🎌 Anime — Mais Bem Avaliados", d: aTv2.results },
      { t: "🎌 Filmes de Anime",            d: aM.results   },
    ];
  },
  action: async () => {
    const [a, t, s, w] = await Promise.all([
      api("/discover/movie", { with_genres: "28",  sort_by: "popularity.desc" }),
      api("/discover/movie", { with_genres: "53",  sort_by: "popularity.desc" }),
      api("/discover/movie", { with_genres: "878", sort_by: "popularity.desc" }),
      api("/discover/movie", { with_genres: "10752",sort_by: "vote_count.desc" }),
    ]);
    return [
      { t: "💥 Ação",               d: a.results },
      { t: "😰 Suspense/Thriller",  d: t.results },
      { t: "🚀 Ficção Científica",  d: s.results },
      { t: "⚔️ Guerra",             d: w.results },
    ];
  },
  comedy: async () => {
    const [m, tv] = await Promise.all([
      api("/discover/movie", { with_genres: "35", sort_by: "popularity.desc" }),
      api("/discover/tv",    { with_genres: "35", sort_by: "popularity.desc" }),
    ]);
    return [
      { t: "😂 Comédias — Filmes",  d: m.results  },
      { t: "😂 Comédias — Séries",  d: tv.results },
    ];
  },
  horror: async () => {
    const [h, mys] = await Promise.all([
      api("/discover/movie", { with_genres: "27", sort_by: "popularity.desc" }),
      api("/discover/movie", { with_genres: "9648",sort_by: "popularity.desc" }),
    ]);
    return [
      { t: "👻 Terror",      d: h.results   },
      { t: "🔍 Mistério",    d: mys.results },
    ];
  },
  romance: async () => {
    const [m, tv] = await Promise.all([
      api("/discover/movie", { with_genres: "10749", sort_by: "popularity.desc" }),
      api("/discover/tv",    { with_genres: "10749", sort_by: "popularity.desc" }),
    ]);
    return [
      { t: "💘 Romance — Filmes",  d: m.results  },
      { t: "💘 Romance — Séries",  d: tv.results },
    ];
  },
  scifi: async () => {
    const [m, tv] = await Promise.all([
      api("/discover/movie", { with_genres: "878", sort_by: "popularity.desc" }),
      api("/discover/tv",    { with_genres: "10765",sort_by: "popularity.desc" }),
    ]);
    return [
      { t: "🚀 Ficção Científica — Filmes", d: m.results  },
      { t: "🚀 Ficção Científica — Séries", d: tv.results },
    ];
  },
  documentary: async () => {
    const [m, tv] = await Promise.all([
      api("/discover/movie", { with_genres: "99", sort_by: "vote_count.desc", "vote_count.gte": 200 }),
      api("/discover/tv",    { with_genres: "99", sort_by: "popularity.desc" }),
    ]);
    return [
      { t: "🎥 Documentários — Filmes", d: m.results  },
      { t: "🎥 Documentários — Séries", d: tv.results },
    ];
  },
};

// ── LOAD CATEGORY ─────────────────────────────────────────────
async function loadCat(cat) {
  const main = document.getElementById("main-content");
  main.innerHTML = "";
  for (let i = 0; i < 3; i++) main.appendChild(makeSkel());

  try {
    const rows = await (CATS[cat] || CATS.all)();
    main.innerHTML = "";
    rows.forEach(({ t, d }) => {
      const row = makeRow(t, d);
      if (row) main.appendChild(row);
    });
    setTimeout(initRowArrows, 150);
    if (window.feather) feather.replace();
  } catch (e) {
    console.error(e);
    main.innerHTML = `
      <div class="api-banner">
        <div class="icon">⚠️</div>
        <div>
          <h3>Chave de API necessária</h3>
          <p>
            Para carregar filmes e séries, substitua <strong>SUA_CHAVE_TMDB</strong> no ficheiro
            <code>main.js</code> e <code>player.js</code> por uma chave gratuita.<br><br>
            ➤ Crie conta grátis em <a href="https://www.themoviedb.org" target="_blank">themoviedb.org</a>
            e obtenha a chave em <a href="https://www.themoviedb.org/settings/api" target="_blank">Definições → API</a>.
          </p>
        </div>
      </div>`;
  }
}

// ── FILTER PILLS + NAV LINKS ──────────────────────────────────
function activateFilter(cat) {
  document.querySelectorAll(".fpill").forEach(p => p.classList.toggle("on", p.dataset.cat === cat));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.cat === cat));
  if (mainNav.classList.contains("open")) {
    mainNav.classList.remove("open");
    menuOverlay.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }
  loadCat(cat);
}

document.querySelectorAll(".fpill").forEach(b =>
  b.addEventListener("click", () => activateFilter(b.dataset.cat)));

document.querySelectorAll(".nav-link").forEach(l =>
  l.addEventListener("click", e => { e.preventDefault(); activateFilter(l.dataset.cat); }));

// ── NOVAS FUNCIONALIDADES ──────────────────────────────────
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    const overlay = document.getElementById("searchOverlay");
    if (overlay && !overlay.classList.contains("open")) {
      overlay.classList.add("open");
      setTimeout(() => document.getElementById("searchInput")?.focus(), 100);
    }
  }
});

window.addEventListener("scroll", () => {
  const heroBd = document.getElementById("heroBd");
  if (!heroBd) return;
  const offset = window.scrollY * 0.35;
  heroBd.style.transform = `scale(1.06) translateY(${offset}px)`;
}, { passive: true });

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  const yr = document.getElementById("currentYear");
  if (yr) yr.textContent = new Date().getFullYear();

  // Carregar Popunder (gerido pelo AdManager - desativado por padrão)
  AdManager.loadPopunder();

  // Hero
  try {
    const d = await api("/trending/all/week");
    heroItems = (d.results || []).filter(i => i.backdrop_path && i.media_type !== "person").slice(0, 8);
    if (heroItems.length) { renderHero(heroItems[0]); buildDots(); resetTimer(); }
  } catch {
    console.warn("⚠️ Erro ao carregar o hero, continuando...");
  }

  // Main content
  await loadCat("all");
})();
