/* ═══════════════════════════════════════════════════════════════
   GETFLIX — player.js
   Streaming: SuperFlix + VidSrc + Vidlink + Autoembed
   Persistência: localStorage | Escolha manual do servidor
   +++ Continue Watching (progresso guardado)
   +++ Gestão centralizada de anúncios (AdManager)
   +++ Idiomas disponíveis (Português forçado)
   +++ Smartlink no clique das recomendações (gerido pelo AdManager)
═══════════════════════════════════════════════════════════════ */

// ── IMPORTAÇÕES ──────────────────────────────────────────────
import AdManager from './js/adManager.js';

// ── CONFIGURAÇÃO ──────────────────────────────────────────────
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
if (!TMDB_KEY) {
  console.error("❌ TMDB_KEY não definida!");
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_W500  = "https://image.tmdb.org/t/p/w500";
const IMG_W300  = "https://image.tmdb.org/t/p/w300";
const IMG_LOGO  = "https://image.tmdb.org/t/p/w92";

// ── STATE ─────────────────────────────────────────────────────
const qs     = new URLSearchParams(location.search);
const CID    = qs.get("id");
const CTYPE  = qs.get("type") || "movie";
let curSeason = 1;
let currentServer = localStorage.getItem('selectedServer') || 'superflix';

const REGION_FALLBACKS = ["PT", "BR", "AO", "US"];

// ── TMDB FETCH ────────────────────────────────────────────────
async function api(path, params = {}) {
  const u = new URL(`${TMDB_BASE}${path}`);
  u.searchParams.set("api_key", TMDB_KEY);
  u.searchParams.set("language", "pt-BR");
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

// ── ATUALIZAR BOTÕES DE SERVIDOR ─────────────────────────────
function updateServerButtons(activeServer) {
  document.querySelectorAll('#serverButtons .srv-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.server === activeServer);
  });
}

// ── STREAMING (SEM FALLBACK) ─────────────────────────────────
function loadStream(season = null, episode = null) {
    const iframe = document.getElementById("mainPlayer");
    const loading = document.getElementById("embedLoading");
    const empty = document.getElementById("noTrailer");

    if (loading) loading.style.display = "flex";
    if (empty) empty.style.display = "none";

    const s = season || 1;
    const e = episode || 1;
    let url = "";

    // ── SUPERFLIX ──────────────────────────────────────────────
    if (currentServer === 'superflix') {
        if (CTYPE === "movie") {
            url = `https://superflixapi.pro/filme/${CID}`;
        } else {
            url = `https://superflixapi.pro/serie/${CID}/${s}/${e}`;
        }
    } else if (currentServer === 'autoembed') {
        if (CTYPE === "movie") {
            url = `https://autoembed.co/movie/tmdb/${CID}`;
        } else {
            url = `https://autoembed.co/tv/tmdb/${CID}-${s}/${e}`;
        }
    } else if (currentServer === 'vidlink') {
        if (CTYPE === "movie") {
            url = `https://vidlink.pro/movie/${CID}`;
        } else {
            url = `https://vidlink.pro/tv/${CID}/${s}/${e}`;
        }
        url += `?primaryColor=e50914&title=true&autoplay=false&poster=true`;
    } else if (currentServer === 'vidsrc') {
        const VIDSRC_DOMAINS = [
            'vidsrcme.ru',
            'vsembed.ru',
            'vsembed.su'
        ];
        const domain = VIDSRC_DOMAINS[0];
        if (CTYPE === "movie") {
            url = `https://${domain}/embed/movie/${CID}`;
        } else {
            url = `https://${domain}/embed/tv/${CID}/${s}/${e}`;
        }
    }

    console.log(`🎬 Carregando servidor: ${currentServer} → ${url}`);
    iframe.src = url;

    // Quando o iframe carregar, esconde o loading
    iframe.onload = () => {
        if (loading) loading.style.display = "none";
        console.log(`✅ Servidor ${currentServer} carregou!`);
    };

    // Fallback de segurança (se o onload não for chamado)
    setTimeout(() => {
        if (loading) loading.style.display = "none";
    }, 10000);
}

// ── GUARDAR E CARREGAR PROGRESSO (Continue Watching) ──────────
function saveProgress(season, episode) {
  if (!CID) return;
  const key = `getflix_progress_${CID}`;
  const data = {
    type: CTYPE,
    season: season || null,
    episode: episode || null,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

function getProgress() {
  if (!CID) return null;
  try {
    const raw = localStorage.getItem(`getflix_progress_${CID}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── INICIALIZAR BOTÕES DE SERVIDOR ────────────────────────────
function initServerButtons() {
    const buttons = document.querySelectorAll('#serverButtons .srv-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const server = btn.dataset.server;
            if (server === currentServer) return;
            currentServer = server;
            localStorage.setItem('selectedServer', server);
            updateServerButtons(server);
            if (CTYPE === 'tv') {
                const activeEp = document.querySelector('.ep-card.active');
                let epNum = 1;
                if (activeEp) {
                    const epText = activeEp.querySelector('.ep-num')?.textContent?.replace('Ep. ', '');
                    epNum = epText ? parseInt(epText) : 1;
                }
                loadStream(curSeason, epNum);
            } else {
                loadStream();
            }
        });
    });
    updateServerButtons(currentServer);
}

// ── BACK BUTTON ─────────────────────────────────────────────────
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/";
});

// ── EPISODES ──────────────────────────────────────────────────
async function loadEpisodes(seasonNum) {
  curSeason = seasonNum;
  const grid = document.getElementById("epsGrid");
  grid.innerHTML = `<div style="padding:20px;color:#555;font-size:13px">A carregar episódios…</div>`;

  try {
    const s = await api(`/tv/${CID}/season/${seasonNum}`);
    grid.innerHTML = "";

    const progress = getProgress();
    let activeEpisode = null;
    if (progress && progress.season === seasonNum) {
      activeEpisode = progress.episode;
    }

    (s.episodes || []).forEach(ep => {
      const card = document.createElement("div");
      card.className = "ep-card";
      if (activeEpisode === ep.episode_number) {
        card.classList.add('active');
      }
      card.innerHTML = `
        ${ep.still_path
          ? `<img class="ep-thumb" src="${IMG_W300}${ep.still_path}" alt="${ep.name || ""}" loading="lazy">`
          : `<div class="ep-thumb" style="background:#111;display:block;width:100%;aspect-ratio:16/9"></div>`}
        <div class="ep-body">
          <div class="ep-num">Ep. ${ep.episode_number}</div>
          <div class="ep-name">${ep.name || "Episódio " + ep.episode_number}</div>
          ${ep.overview ? `<div class="ep-overview">${ep.overview.slice(0, 110)}${ep.overview.length > 110 ? "…" : ""}</div>` : ""}
        </div>`;
      
      card.addEventListener("click", () => {
        loadStream(seasonNum, ep.episode_number);
        document.querySelectorAll('.ep-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        saveProgress(seasonNum, ep.episode_number);
      });

      grid.appendChild(card);
    });

    if (activeEpisode) {
      const activeCard = grid.querySelector('.ep-card.active');
      if (activeCard) {
        setTimeout(() => {
          activeCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
      }
    }

  } catch {
    grid.innerHTML = `<div style="padding:20px;color:#555;font-size:13px">Erro ao carregar episódios.</div>`;
  }
}

// ── RECOMMENDATIONS (com Smartlink integrado via AdManager) ──
async function loadRecs() {
  const section = document.getElementById("recsSection");
  const grid    = document.getElementById("recsGrid");
  try {
    const ep = CTYPE === "tv" ? `/tv/${CID}/recommendations` : `/movie/${CID}/recommendations`;
    const d  = await api(ep);
    const items = (d.results || []).filter(i => i.poster_path).slice(0, 14);
    if (!items.length) { section.style.display = "none"; return; }
    items.forEach(item => {
      const t   = item.title || item.name;
      const tp  = item.media_type || CTYPE;
      const yr  = (item.release_date || item.first_air_date || "").slice(0, 4);
      const scr = item.vote_average ? item.vote_average.toFixed(1) : null;
      const card = document.createElement("div");
      card.className = "mc";
      card.style.width = "100%";
      card.innerHTML = `
        <img class="mc-poster" src="${IMG_W500}${item.poster_path}" alt="${t}" loading="lazy">
        <div class="mc-veil"><div class="mc-play">▶</div></div>
        <div class="mc-body">
          <div class="mc-title">${t}</div>
          <div class="mc-meta">
            <span>${yr}</span>
            ${scr ? `<span class="mc-star">★ ${scr}</span>` : ""}
          </div>
        </div>`;
      
      card.addEventListener("click", () => {
        // ✅ Abrir Smartlink (gerido pelo AdManager)
        AdManager.openSmartlink();
        // ✅ Redirecionar para o player (sempre abre)
        window.location.href = `player.html?id=${item.id}&type=${tp}`;
      });
      
      grid.appendChild(card);
    });
  } catch { section.style.display = "none"; }
}

// ── TAG HELPERS ───────────────────────────────────────────────
function tag(cls, text) {
  return `<span class="tag ${cls}">${text}</span>`;
}

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  const yr = document.getElementById("currentYear");
  if (yr) yr.textContent = new Date().getFullYear();

  if (!CID) { location.href = "/"; return; }

  // Inicializar servidores e stream
  initServerButtons();
  loadStream();

  // Carregar Popunder (gerido pelo AdManager - desativado por padrão)
  AdManager.loadPopunder();

  try {
    const ep = CTYPE === "tv" ? `/tv/${CID}` : `/movie/${CID}`;
    const item = await api(ep, { append_to_response: "credits,genres" });

    const poster = document.getElementById("playerPoster");
    if (item.poster_path) { poster.src = `${IMG_W500}${item.poster_path}`; }
    else poster.closest(".player-poster").style.display = "none";

    const t = item.title || item.name || "Sem título";
    document.getElementById("pTitle").textContent = t;
    document.title = `GETFLIX — ${t}`;

    const genres = (item.genres || []).slice(0, 3).map(g => tag("tag tag-genre", g.name)).join("");
    document.getElementById("pTags").innerHTML =
      tag("tag tag-type", CTYPE === "tv" ? "Série" : "Filme") + genres;

    const yr2  = (item.release_date || item.first_air_date || "").slice(0, 4);
    const scr  = item.vote_average ? `<span class="stars">★ ${item.vote_average.toFixed(1)}</span>` : "";
    const dur  = item.runtime
      ? `${item.runtime}min`
      : (item.episode_run_time?.[0] ? `${item.episode_run_time[0]}min/ep` : "");
    const nseas= item.number_of_seasons ? `${item.number_of_seasons} temporada${item.number_of_seasons > 1 ? "s" : ""}` : "";

    // ── IDIOMAS DISPONÍVEIS (spoken_languages) com Português forçado ──
    const spokenLangs = (item.spoken_languages || []).map(l => l.name);
    if (!spokenLangs.includes('Português')) {
        spokenLangs.push('Português');
    }
    const langDisplay = spokenLangs.join(', ') || (item.original_language || "").toUpperCase();

    const metas = [yr2, scr, dur, langDisplay, nseas].filter(Boolean);
    document.getElementById("pMeta").innerHTML = metas.map((m, i) =>
      i === 0 ? m : `<span class="sep"></span>${m}`).join("");

    document.getElementById("pOverview").textContent = item.overview || "Sinopse não disponível.";

    if (CTYPE === "tv" && item.seasons) {
      document.getElementById("epsSection").style.display = "block";
      const sel = document.getElementById("seasonSelect");
      const valSeasons = item.seasons.filter(s => s.season_number > 0);
      valSeasons.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.season_number;
        opt.textContent = `Temporada ${s.season_number}  (${s.episode_count} ep.)`;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => loadEpisodes(+sel.value));
      if (valSeasons.length) {
        await loadEpisodes(valSeasons[0].season_number);
      }
    }

  } catch (e) {
    console.error(e);
    document.getElementById("pTitle").textContent = "Conteúdo não encontrado";
    document.getElementById("pOverview").textContent =
      "Verifique a chave de API no ficheiro player.js.";
  }

  loadRecs();
})();
