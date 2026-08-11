/**
 * ====================================================================
 * adManager.js - Gestor Centralizado de Anúncios (GETFLIX / Adsterra)
 * ====================================================================
 *
 * Responsabilidades:
 *
 * - Controlar o Smartlink
 * - Controlar o Popunder
 * - Manter temporizadores INDEPENDENTES para cada formato
 * - Evitar múltiplos disparos do mesmo anúncio
 * - Evitar carregar o Popunder várias vezes na mesma página
 * - Guardar timestamps no localStorage
 * - Proteger contra múltiplos cliques
 * - Fornecer uma API limpa para os restantes módulos
 *
 * Utilização:
 *
 * import AdManager from './js/adManager.js';
 *
 * // Smartlink:
 * AdManager.openSmartlink();
 *
 * // Popunder:
 * AdManager.loadPopunder();
 *
 * ====================================================================
 */

// ── CONFIGURAÇÕES CENTRALIZADAS ─────────────────────────────────────

const CONFIG = {

  // ================================================================
  // INTERVALOS
  // ================================================================

  // Intervalo mínimo entre disparos do Smartlink
  SMARTLINK_INTERVAL: 30 * 60 * 1000, // 30 minutos

  // Intervalo mínimo entre carregamentos do Popunder
  // Alterado de 30 minutos para 10 segundos para permitir
  // que a Adsterra controle a frequência (4 popunders em 2 horas)
  POPUNDER_INTERVAL: 10 * 1000, // 10 segundos


  // ================================================================
  // ATIVAÇÃO DOS FORMATOS
  // ================================================================

  ENABLE_SMARTLINK: true,

  ENABLE_POPUNDER: true,


  // ================================================================
  // URLs ADSTERRA
  // ================================================================

  // SMARTLINK_URL atualizado para usar redirecionamento personalizado
  // O redirecionamento está configurado no vercel.json
  // Isso evita bloqueios do SmartScreen e aumenta a confiança do utilizador
SMARTLINK_URL: 'https://getflix-phi.vercel.app/go/smartlink.html',
  POPUNDER_URL:'https://mistletoeframesethel.com/fa/24/cc/fa24ccdea8ef1c47e43a94c4af77eb64.js',


  // ================================================================
  // LOCAL STORAGE
  // ================================================================

  // Timestamp do último Smartlink
  SMARTLINK_STORAGE_KEY:
    'getflix_smartlink_last_timestamp',

  // Timestamp do último Popunder
  POPUNDER_STORAGE_KEY:
    'getflix_popunder_last_timestamp',


  // ================================================================
  // SESSION STORAGE
  // ================================================================

  // Proteção contra cliques consecutivos no Smartlink
  SMARTLINK_PROCESSING_KEY:
    'getflix_smartlink_processing',

  // Proteção contra carregamento duplicado do Popunder
  POPUNDER_LOADED_KEY:
    'getflix_popunder_loaded'

};


// ── MÓDULO PRINCIPAL ────────────────────────────────────────────────

const AdManager = {

  // ================================================================
  // FUNÇÕES INTERNAS
  // ================================================================

  /**
   * Verifica se um determinado anúncio pode ser mostrado.
   *
   * @param {string} storageKey
   * @param {number} interval
   * @returns {boolean}
   */
  canShow(storageKey, interval) {

    console.log(`🔍 [AdManager] canShow() - StorageKey: ${storageKey}`);

    const lastTimestamp = localStorage.getItem(storageKey);

    // Nunca mostrou
    if (!lastTimestamp) {
      console.log(`✅ [AdManager] canShow() - Nunca mostrou, permitido.`);
      return true;
    }

    const last = Number(lastTimestamp);

    // Timestamp inválido
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


  /**
   * Guarda timestamp de um anúncio.
   *
   * @param {string} storageKey
   */
  markShown(storageKey) {

    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    console.log(`📝 [AdManager] markShown() - ${storageKey} = ${new Date(now).toLocaleTimeString()}`);

  },


  /**
   * Obtém minutos restantes para um anúncio.
   *
   * @param {string} storageKey
   * @param {number} interval
   * @returns {number}
   */
  getRemaining(storageKey, interval) {

    const lastTimestamp =
      localStorage.getItem(storageKey);

    if (!lastTimestamp) {
      return 0;
    }

    const last = Number(lastTimestamp);

    if (!Number.isFinite(last)) {
      return 0;
    }

    const elapsed =
      Date.now() - last;

    const remaining =
      interval - elapsed;

    if (remaining <= 0) {
      return 0;
    }

    return Math.ceil(
      remaining / 60000
    );

  },


  // ================================================================
  // SMARTLINK
  // ================================================================

  /**
   * Abre o Smartlink.
   *
   * O Smartlink só é contabilizado como disparado
   * quando window.open() consegue criar a janela.
   *
   * @returns {boolean}
   */
  openSmartlink() {

    console.log('🚀 [Smartlink] ===== INICIANDO ABERTURA =====');

    // ------------------------------------------------------------
    // 1. Verificar se está ativado
    // ------------------------------------------------------------

    if (!CONFIG.ENABLE_SMARTLINK) {

      console.log('🔕 [Smartlink] Desativado por configuração.');
      return false;
    }

    console.log('✅ [Smartlink] Ativado por configuração.');


    // ------------------------------------------------------------
    // 2. Evitar múltiplos cliques instantâneos
    // ------------------------------------------------------------

    const processing = sessionStorage.getItem(CONFIG.SMARTLINK_PROCESSING_KEY);
    console.log(`🔍 [Smartlink] Processing flag: ${processing}`);

    if (processing === 'true') {

      console.log('⏳ [Smartlink] Já está a ser processado. Ignorando.');
      return false;
    }


    // ------------------------------------------------------------
    // 3. Verificar intervalo do Smartlink
    // ------------------------------------------------------------

    const canShowResult = this.canShow(
      CONFIG.SMARTLINK_STORAGE_KEY,
      CONFIG.SMARTLINK_INTERVAL
    );

    console.log(`🔍 [Smartlink] canShow result: ${canShowResult}`);

    if (!canShowResult) {

      const remaining =
        this.getRemaining(
          CONFIG.SMARTLINK_STORAGE_KEY,
          CONFIG.SMARTLINK_INTERVAL
        );

      console.log(
        `⏳ [Smartlink] Bloqueado. Faltam aproximadamente ${remaining} minutos.`
      );

      return false;
    }


    // ------------------------------------------------------------
    // 4. Marcar processamento
    // ------------------------------------------------------------

    sessionStorage.setItem(
      CONFIG.SMARTLINK_PROCESSING_KEY,
      'true'
    );

    console.log('🔄 [Smartlink] Flag de processamento ativada.');


    try {

      // ----------------------------------------------------------
      // 5. Abrir Smartlink
      // ----------------------------------------------------------

      console.log(`🔗 [Smartlink] A tentar abrir URL: ${CONFIG.SMARTLINK_URL.substring(0, 50)}...`);

      const win = window.open(
        CONFIG.SMARTLINK_URL,
        '_blank',
        'noopener,noreferrer'
      );

      console.log(`🔍 [Smartlink] window.open result: ${win ? 'Window criada' : 'NULL'}`);


      // ----------------------------------------------------------
      // 6. Verificar bloqueio do navegador
      // ----------------------------------------------------------

      if (
        !win ||
        win.closed ||
        typeof win.closed === 'undefined'
      ) {

        console.warn(
          '⚠️ [Smartlink] Bloqueado pelo navegador (pop-up blocker).'
        );

        // ── TRATAMENTO DE ERRO (FALLBACK) ──
        console.log('🔄 [Smartlink] Tentando fallback: redirecionamento...');

        try {
          // Forçar redirecionamento (menos ideal, mas funciona)
          window.location.href = CONFIG.SMARTLINK_URL;
          console.log('✅ [Smartlink] Fallback: redirecionamento executado.');
          return true;
        } catch (fallbackError) {
          console.error(
            '❌ [Smartlink] Fallback de redirecionamento falhou:',
            fallbackError
          );
        }

        // Se chegou aqui, o fallback falhou
        sessionStorage.removeItem(
          CONFIG.SMARTLINK_PROCESSING_KEY
        );

        console.log('🔓 [Smartlink] Flag de processamento libertada (fallback falhou).');

        return false;
      }


      // ----------------------------------------------------------
      // 7. Smartlink abriu corretamente
      // ----------------------------------------------------------

      console.log('✅ [Smartlink] ABERTO COM SUCESSO!');


      // Só agora registamos o timestamp
      this.markShown(
        CONFIG.SMARTLINK_STORAGE_KEY
      );

      console.log('📝 [Smartlink] Timestamp guardado.');


      // ----------------------------------------------------------
      // 8. Libertar proteção contra clique duplicado
      // ----------------------------------------------------------

      setTimeout(() => {

        sessionStorage.removeItem(
          CONFIG.SMARTLINK_PROCESSING_KEY
        );

        console.log('🔓 [Smartlink] Flag de processamento libertada (timeout).');

      }, 1000);


      console.log('✅ [Smartlink] ===== ABERTURA CONCLUÍDA COM SUCESSO =====');
      return true;


    } catch (error) {

      console.error(
        '❌ [Smartlink] Erro na abertura:',
        error
      );

      sessionStorage.removeItem(
        CONFIG.SMARTLINK_PROCESSING_KEY
      );

      console.log('🔓 [Smartlink] Flag de processamento libertada (erro).');
      console.log('❌ [Smartlink] ===== ABERTURA FALHOU =====');

      return false;
    }

  },


  // ================================================================
  // POPUNDER
  // ================================================================

  /**
   * Carrega o Popunder do Adsterra.
   *
   * O Popunder é independente do Smartlink.
   *
   * @returns {boolean}
   */
  loadPopunder() {

    console.log('🚀 [Popunder] ===== INICIANDO CARREGAMENTO =====');

    // ------------------------------------------------------------
    // 1. Verificar se está ativado
    // ------------------------------------------------------------

    if (!CONFIG.ENABLE_POPUNDER) {

      console.log('🔕 [Popunder] Desativado por configuração.');
      return false;
    }

    console.log('✅ [Popunder] Ativado por configuração.');


    // ------------------------------------------------------------
    // 2. Evitar carregar duas vezes na mesma página
    // ------------------------------------------------------------

    const loaded = sessionStorage.getItem(CONFIG.POPUNDER_LOADED_KEY);
    console.log(`🔍 [Popunder] Loaded flag: ${loaded}`);

    if (loaded === 'true') {

      console.log('⏳ [Popunder] Já foi carregado nesta página.');
      return false;
    }


    // ------------------------------------------------------------
    // 3. Verificar se o script já existe no DOM
    // ------------------------------------------------------------

    const existingScript = document.querySelector(
      `script[src="${CONFIG.POPUNDER_URL}"]`
    );

    if (existingScript) {

      console.log('⏳ [Popunder] Script já existe no DOM.');

      // Marca como carregado para evitar novas tentativas
      sessionStorage.setItem(
        CONFIG.POPUNDER_LOADED_KEY,
        'true'
      );

      return false;
    }


    // ------------------------------------------------------------
    // 4. Verificar intervalo do Popunder
    // ------------------------------------------------------------

    const canShowResult = this.canShow(
      CONFIG.POPUNDER_STORAGE_KEY,
      CONFIG.POPUNDER_INTERVAL
    );

    console.log(`🔍 [Popunder] canShow result: ${canShowResult}`);

    if (!canShowResult) {

      const remaining =
        this.getRemaining(
          CONFIG.POPUNDER_STORAGE_KEY,
          CONFIG.POPUNDER_INTERVAL
        );

      console.log(
        `⏳ [Popunder] Bloqueado. Faltam aproximadamente ${remaining} minutos.`
      );

      return false;
    }


    try {

      // ----------------------------------------------------------
      // 5. Criar script Adsterra
      // ----------------------------------------------------------

      console.log('📦 [Popunder] A criar script...');

      const script =
        document.createElement('script');

      script.src =
        CONFIG.POPUNDER_URL;

      script.async = true;

      // Opcional: adicionar atributo para identificação
      script.dataset.adsterra = 'popunder';

      console.log(`📦 [Popunder] Script criado: ${CONFIG.POPUNDER_URL}`);


      // ----------------------------------------------------------
      // 6. Adicionar ao documento
      // ----------------------------------------------------------

      document.body.appendChild(script);
      console.log('✅ [Popunder] Script adicionado ao DOM.');


      // ----------------------------------------------------------
      // 7. Marcar como carregado nesta página
      // ----------------------------------------------------------

      sessionStorage.setItem(
        CONFIG.POPUNDER_LOADED_KEY,
        'true'
      );

      console.log('📝 [Popunder] Flag de carregamento ativada.');


      // ----------------------------------------------------------
      // 8. Guardar timestamp próprio do Popunder
      // ----------------------------------------------------------

      this.markShown(
        CONFIG.POPUNDER_STORAGE_KEY
      );

      console.log('📝 [Popunder] Timestamp guardado.');


      console.log('✅ [Popunder] ===== CARREGADO COM SUCESSO =====');
      return true;


    } catch (error) {

      console.error(
        '❌ [Popunder] Erro:',
        error
      );

      console.log('❌ [Popunder] ===== CARREGAMENTO FALHOU =====');
      return false;
    }

  },


  // ================================================================
  // RESET
  // ================================================================

  /**
   * Reseta todos os temporizadores de anúncios.
   *
   * Útil durante testes.
   */
  resetAdTimer() {

    console.log('🔄 [AdManager] ===== RESETANDO TEMPORIZADORES =====');

    // Smartlink
    localStorage.removeItem(
      CONFIG.SMARTLINK_STORAGE_KEY
    );
    console.log(`🗑️ [AdManager] Removido: ${CONFIG.SMARTLINK_STORAGE_KEY}`);

    // Popunder
    localStorage.removeItem(
      CONFIG.POPUNDER_STORAGE_KEY
    );
    console.log(`🗑️ [AdManager] Removido: ${CONFIG.POPUNDER_STORAGE_KEY}`);

    // Flags de sessão
    sessionStorage.removeItem(
      CONFIG.SMARTLINK_PROCESSING_KEY
    );
    sessionStorage.removeItem(
      CONFIG.POPUNDER_LOADED_KEY
    );
    console.log('🗑️ [AdManager] Flags de sessão removidas.');

    // Compatibilidade com a versão antiga
    localStorage.removeItem(
      'getflix_last_ad_timestamp'
    );
    sessionStorage.removeItem(
      'getflix_ad_processing'
    );
    console.log('🗑️ [AdManager] Flags de compatibilidade removidas.');

    console.log('✅ [AdManager] ===== TEMPORIZADORES REINICIADOS =====');
  },


  // ================================================================
  // SMARTLINK — TEMPO RESTANTE
  // ================================================================

  /**
   * Retorna minutos restantes do Smartlink.
   *
   * @returns {number}
   */
  getSmartlinkRemainingMinutes() {

    return this.getRemaining(
      CONFIG.SMARTLINK_STORAGE_KEY,
      CONFIG.SMARTLINK_INTERVAL
    );

  },


  // ================================================================
  // POPUNDER — TEMPO RESTANTE
  // ================================================================

  /**
   * Retorna minutos restantes do Popunder.
   *
   * @returns {number}
   */
  getPopunderRemainingMinutes() {

    return this.getRemaining(
      CONFIG.POPUNDER_STORAGE_KEY,
      CONFIG.POPUNDER_INTERVAL
    );

  },


  // ================================================================
  // COMPATIBILIDADE
  // ================================================================

  /**
   * Mantido para compatibilidade com código antigo.
   *
   * Retorna o tempo restante do Smartlink.
   *
   * @returns {number}
   */
  getRemainingMinutes() {

    return this.getSmartlinkRemainingMinutes();

  },


  // ================================================================
  // STATUS
  // ================================================================

  /**
   * Verifica se o Smartlink está ativado.
   *
   * @returns {boolean}
   */
  isSmartlinkEnabled() {

    return CONFIG.ENABLE_SMARTLINK;

  },


  /**
   * Verifica se o Popunder está ativado.
   *
   * @returns {boolean}
   */
  isPopunderEnabled() {

    return CONFIG.ENABLE_POPUNDER;

  },


  /**
   * Verifica se o Smartlink pode ser mostrado agora.
   *
   * @returns {boolean}
   */
  canShowSmartlink() {

    return this.canShow(
      CONFIG.SMARTLINK_STORAGE_KEY,
      CONFIG.SMARTLINK_INTERVAL
    );

  },


  /**
   * Verifica se o Popunder pode ser carregado agora.
   *
   * @returns {boolean}
   */
  canShowPopunder() {

    return this.canShow(
      CONFIG.POPUNDER_STORAGE_KEY,
      CONFIG.POPUNDER_INTERVAL
    );

  }

};


// ── EXPORTAÇÃO ─────────────────────────────────────────────────────

export default AdManager;
