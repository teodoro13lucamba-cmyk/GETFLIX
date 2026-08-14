/**
 * ====================================================================
 * adManager.js - Gestor Centralizado de Anúncios (GETFLIX / Monetag)
 * ====================================================================
 */

const CONFIG = {
  SMARTLINK_INTERVAL: 30 * 60 * 1000, 
  POPUNDER_INTERVAL: 10 * 1000,
  ENABLE_SMARTLINK: true,
  ENABLE_POPUNDER: false, // Popunder carregado direto no HTML

  // Direct link · Efficient tag (Monetag)
  SMARTLINK_URL: 'https://omg10.com/4/11574150',
  POPUNDER_URL: '', 

  SMARTLINK_STORAGE_KEY: 'getflix_smartlink_last_timestamp',
  POPUNDER_STORAGE_KEY: 'getflix_popunder_last_timestamp',
  SMARTLINK_PROCESSING_KEY: 'getflix_smartlink_processing',
  POPUNDER_LOADED_KEY: 'getflix_popunder_loaded'
};

const AdManager = {

  canShow(storageKey, interval) {
    const lastTimestamp = localStorage.getItem(storageKey);
    if (!lastTimestamp) return true;
    const last = Number(lastTimestamp);
    if (!Number.isFinite(last)) {
      localStorage.removeItem(storageKey);
      return true;
    }
    return (Date.now() - last) >= interval;
  },

  markShown(storageKey) {
    localStorage.setItem(storageKey, String(Date.now()));
  },

  getRemaining(storageKey, interval) {
    const lastTimestamp = localStorage.getItem(storageKey);
    if (!lastTimestamp) return 0;
    const last = Number(lastTimestamp);
    if (!Number.isFinite(last)) return 0;
    const remaining = interval - (Date.now() - last);
    return remaining <= 0 ? 0 : Math.ceil(remaining / 60000);
  },

  openSmartlink() {
    if (!CONFIG.ENABLE_SMARTLINK) return false;

    const processing = sessionStorage.getItem(CONFIG.SMARTLINK_PROCESSING_KEY);
    if (processing === 'true') return false;

    if (!this.canShow(CONFIG.SMARTLINK_STORAGE_KEY, CONFIG.SMARTLINK_INTERVAL)) return false;

    sessionStorage.setItem(CONFIG.SMARTLINK_PROCESSING_KEY, 'true');

    try {
      const win = window.open(CONFIG.SMARTLINK_URL, '_blank', 'noopener,noreferrer');
      
      // ✅ CORREÇÃO: Se o pop-up falhar, não redireciona a página principal para não atrapalhar o bot
      if (!win || win.closed || typeof win.closed === 'undefined') {
        console.warn('⚠️ [Smartlink] Pop-up não abriu.');
        sessionStorage.removeItem(CONFIG.SMARTLINK_PROCESSING_KEY);
        return false;
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

  loadPopunder() {
    // Gerenciado globalmente pelo script no HTML
    return false; 
  }
};

export default AdManager;
