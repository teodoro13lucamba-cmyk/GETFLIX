/**
 * ====================================================================
 * adManager.js - Gestor Centralizado de Anúncios (GETFLIX / Adsterra)
 * ====================================================================
 */

// ── CONFIGURAÇÕES CENTRALIZADAS ─────────────────────────────────────

const CONFIG = {

  // ================================================================
  // INTERVALOS
  // ================================================================

  SMARTLINK_INTERVAL: 30 * 60 * 1000, // 30 minutos
  POPUNDER_INTERVAL: 10 * 1000, // 10 segundos

  // ================================================================
  // ATIVAÇÃO DOS FORMATOS
  // ================================================================

  ENABLE_SMARTLINK: true,
  ENABLE_POPUNDER: true,

  // ================================================================
  // URLs ADSTERRA (Domínio: getflixfree.vercel.app)
  // ================================================================

  SMARTLINK_URL: 'https://www.effectivecpmnetwork.com/habtc2qkw7?key=5ba17ad7efbd4daf587dc0efc0b477d3',
  POPUNDER_URL: 'https://pl30841204.effectivecpmnetwork.com/6f/cb/dd/6fcbddbecb4b9c6e9f96be80a2734585.js',

  // ================================================================
  // LOCAL STORAGE
  // ================================================================

  SMARTLINK_STORAGE_KEY: 'getflix_smartlink_last_timestamp',
  POPUNDER_STORAGE_KEY: 'getflix_popunder_last_timestamp',

  // ================================================================
  // SESSION STORAGE
  // ================================================================

  SMARTLINK_PROCESSING_KEY: 'getflix_smartlink_processing',
  POPUNDER_LOADED_KEY: 'getflix_popunder_loaded'
};

// ── MÓDULO PRINCIPAL ────────────────────────────────────────────────

const AdManager = {

  // ================================================================
  // FUNÇÕES INTERNAS
  // ================================================================

  canShow(storageKey, interval) {
    console.log(`🔍 [AdManager] canShow() - StorageKey: ${storageKey}`);
    const lastTimestamp = localStorage.getItem(storageKey);
    if (!lastTimestamp) {
      console.log(`✅ [AdManager] canShow() - Nunca mostrou, permitido.`);
      return true;
    }
    const last = Number(lastTimestamp);
    if (!Number.isFinite(last)) {
      console.log(`⚠️ [AdManager] canShow() - Timestamp inválido, removendo.`);
      localStorage.removeItem(storageKey);
      return true;
    }
    const elapsed = Date.now() - last;
    const remaining = interval - elapsed;
    console.log(`📊 [AdManager] canShow() - Último: ${new Date(last).toLocaleTimeString()}, Elapsed: ${Math.round(elapsed/60000)}min, Remaining: ${Math.round(remaining/60000)}min`);
    return elapsed >= interval;
  },

  markShown(storageKey) {
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    console.log(`📝 [AdManager] markShown() - ${storageKey} = ${new Date(now).toLocaleTimeString()}`);
  },

  getRemaining(storageKey, interval) {
    const lastTimestamp = localStorage.getItem(storageKey);
    if (!lastTimestamp) return 0;
    const last = Number(lastTimestamp);
    if (!Number.isFinite(last)) return 0;
    const elapsed = Date.now() - last;
    const remaining = interval - elapsed;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 60000);
  },

  // ================================================================
  // SMARTLINK
  // ================================================================

  openSmartlink() {
    console.log('🚀 [Smartlink] ===== INICIANDO ABERTURA =====');

    if (!CONFIG.ENABLE_SMARTLINK) {
      console.log('🔕 [Smartlink] Desativado por configuração.');
      return false;
    }

    const processing = sessionStorage.getItem(CONFIG.SMARTLINK_PROCESSING_KEY);
    if (processing === 'true') {
      console.log('⏳ [Smartlink] Já está a ser processado. Ignorando.');
      return false;
    }

    const canShowResult = this.canShow(CONFIG.SMARTLINK_STORAGE_KEY, CONFIG.SMARTLINK_INTERVAL);
    if (!canShowResult) {
      console.log('⏳ [Smartlink] Bloqueado pelo intervalo de tempo.');
      return false;
    }

    sessionStorage.setItem(CONFIG.SMARTLINK_PROCESSING_KEY, 'true');

    try {
      const win = window.open(CONFIG.SMARTLINK_URL, '_blank', 'noopener,noreferrer');
      
      if (!win || win.closed || typeof win.closed === 'undefined') {
        console.warn('⚠️ [Smartlink] Bloqueado pelo navegador. Tentando redirecionamento.');
        try {
          window.location.href = CONFIG.SMARTLINK_URL;
          return true;
        } catch (e) {
          sessionStorage.removeItem(CONFIG.SMARTLINK_PROCESSING_KEY);
          return false;
        }
      }

      this.markShown(CONFIG.SMARTLINK_STORAGE_KEY);
      setTimeout(() => sessionStorage.removeItem(CONFIG.SMARTLINK_PROCESSING_KEY), 1000);
      
      console.log('✅ [Smartlink] ABERTO COM SUCESSO!');
      return true;
    } catch (error) {
      sessionStorage.removeItem(CONFIG.SMARTLINK_PROCESSING_KEY);
      console.error('❌ [Smartlink] Erro:', error);
      return false;
    }
  },

  // ================================================================
  // POPUNDER
  // ================================================================

  loadPopunder() {
    if (!CONFIG.ENABLE_POPUNDER) return false;

    const loaded = sessionStorage.getItem(CONFIG.POPUNDER_LOADED_KEY);
    if (loaded === 'true') return false;

    const canShowResult = this.canShow(CONFIG.POPUNDER_STORAGE_KEY, CONFIG.POPUNDER_INTERVAL);
    if (!canShowResult) return false;

    try {
      const script = document.createElement('script');
      script.src = CONFIG.POPUNDER_URL;
      script.async = true;
      document.body.appendChild(script);
      
      sessionStorage.setItem(CONFIG.POPUNDER_LOADED_KEY, 'true');
      this.markShown(CONFIG.POPUNDER_STORAGE_KEY);
      console.log('✅ [Popunder] Script injetado.');
      return true;
    } catch (error) {
      console.error('❌ [Popunder] Erro:', error);
      return false;
    }
  }
};

export default AdManager;
