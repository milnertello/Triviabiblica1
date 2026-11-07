// © 2026 Milner Tello Guzman. Todos los derechos reservados.

    /* CONFIG */
    const MAX_LEVELS = 30;
    const LEVEL_MAP_HEIGHT = 3000;
    const LEVEL_QUESTION_COUNT = 6;
    const TRUE_FALSE_QUESTION_COUNT = 20;
    const TOTAL_QUESTION_COUNT = MAX_LEVELS * LEVEL_QUESTION_COUNT + TRUE_FALSE_QUESTION_COUNT;
    let lang = localStorage.getItem('lang') || "es";
    document.documentElement.lang = lang;
    let unlocked = Math.max(1, Math.min(parseInt(localStorage.getItem('unlocked'), 10) || 1, MAX_LEVELS));
    let coins = parseInt(localStorage.getItem('coins')) || 0;
    let levelStars = JSON.parse(localStorage.getItem('levelStars')) || {};
    let survivalHighScore = parseInt(localStorage.getItem('survivalHighScore')) || 0;
    
    // Premium Tracking
    let stats = JSON.parse(localStorage.getItem('stats')) || { answered: 0, correct: 0, maxCombo: 0 };
    let achievements = JSON.parse(localStorage.getItem('achievements')) || {};
    let inventory = JSON.parse(localStorage.getItem('inventory')) || { forest: false, ocean: false };
    // Compatibilidad: agregar llaves nuevas si faltan (para partidas antiguas)
    const inventoryDefaults = {
      forest: false,
      ocean: false,
      sunset: false,
      mint: false,
      candy: false,
      space: false,
      royal: false,
      neon: false,
      angel: false
    };
    inventory = Object.assign({}, inventoryDefaults, inventory || {});
    let lastDailyClaim = localStorage.getItem('lastDailyClaim') || "";
    let dailyStreak = parseInt(localStorage.getItem('dailyStreak')) || 0;
    
    let level = 1;
    let index = 0;
    let score = 0;
    let timer;
    let answerTransitionTimer;
    let time = 15;
    let baseTime = 15;
    let ageDifficulty = localStorage.getItem('ageDifficulty') || 'teen';
    let soundMuted = localStorage.getItem('soundMuted') === '1';
    let lastVolumeBeforeMute = parseFloat(localStorage.getItem('lastVolumeBeforeMute')) || 0.5;
    let survivalBonusLives = parseInt(localStorage.getItem('survivalBonusLives')) || 0;
    let lastGiftClaimTs = parseInt(localStorage.getItem('lastGiftClaimTs')) || 0;
    const giftCooldownMs = 30 * 60 * 1000;
    let questions = [];
    let usedQuestionIndices = new Set(); // evita repetir preguntas entre niveles
    let displayedAnswerOptionIndexes = [];

    const questionFiles = ['preguntas/preguntas_banco_180.json'];

    // Gamification
    let isSurvival = false;
    let lives = 3;
    let combo = 0;
    let survivalScore = 0;
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === '1';
    let onboardingStep = 0;
    let lowPerfMode = false;

    // Helper function for haptic feedback
    function vibrate(pattern = [50]) {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    }

    // Helper function for efficient star rendering
    function renderStars(container, count, earned) {
      if (!container) return;
      // Clear existing content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      // Create new stars
      for (let j = 0; j < count; j++) {
        const star = document.createElement('span');
        star.textContent = '⭐';
        star.className = j < earned ? 'star-gold' : 'star-gray';
        if (j < earned) {
          star.style.animationDelay = `${j * 0.2}s`;
        }
        container.appendChild(star);
      }
    }

    // Helper function to share results
    function shareResult(level, score, stars) {
      const scoreText = `${score}/${questions.length}`;
      let text = `¡Completé el Nivel ${level} en Trivia Bíblica: Aprende Jugando con ${scoreText} puntos y ${stars}⭐! ¿Puedes superarlo?`;
      if (lang === "en") text = `I completed Level ${level} in Trivia Bíblica: Aprende Jugando with ${scoreText} points and ${stars}⭐! Can you beat it?`;
      if (lang === "qu") text = `¡Tukurqani Nivel ${level}ta Trivia Bíblica: Aprende Jugando pi ${scoreText} puntoswan ${stars}⭐! ¿Qanpas atipawaqchu?`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Trivia Bíblica: Aprende Jugando Challenge',
          text: text,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(text + ' ' + window.location.href).then(() => {
          let alertMsg = "Resultado copiado al portapapeles";
          if (lang === "en") alertMsg = "Result copied to clipboard";
          if (lang === "qu") alertMsg = "Rikumanta qillqapi waqaycharqani";
          alert(alertMsg);
        });
      }
    }

    // Helper function to show tutorial
    function showTutorial() {
      localStorage.setItem('tutorialShown', 'true');
      return; // Tutorial deshabilitado ya que está en la pantalla principal
      
      const tutorialSteps = [
        { title: 
            lang === "es" ? "¡Bienvenido a Trivia Bíblica: Aprende Jugando!" :
            lang === "qu" ? "¡Bienvenido a Trivia Bíblica: Aprende Jugando!" :
            "Welcome to Trivia Bíblica: Aprende Jugando!", 
          content: 
            lang === "es" ? "Responde preguntas bíblicas para ganar estrellas y monedas." :
            lang === "qu" ? "Bibliamanta tapukuykunata kutichiy ch'askiy estrellaswan qullqita." :
            "Answer Bible questions to earn stars and coins." },
        { title: 
            lang === "es" ? "Modos de Juego" :
            lang === "qu" ? "Pukllay laya" :
            "Game Modes", 
          content: 
            lang === "es" ? "Elige entre Quiz, Supervivencia o Mapa de Niveles." :
            lang === "qu" ? "Akllay Quiz, Kawsay o Nivel Mapa ukhupi." :
            "Choose between Quiz, Survival or Level Map." },
        { title: 
            lang === "es" ? "Poderes Especiales" :
            lang === "qu" ? "Sapaq atiykuna" :
            "Special Powers", 
          content: 
            lang === "es" ? "Usa monedas para pistas, tiempo extra o eliminar opciones." :
            lang === "qu" ? "Qullqita llamk'achiy willayninkunaq, yapamanta pachaq o akllanakunaq chinkachinapaq." :
            "Use coins for hints, extra time or eliminate options." },
        { title: 
            lang === "es" ? "¡Diviértete!" :
            lang === "qu" ? "¡Kusikuy!" :
            "Have Fun!", 
          content: 
            lang === "es" ? "Aprende la Biblia mientras juegas. ¡Que Dios te bendiga!" :
            lang === "qu" ? "Pukllashwan Bibliata yachay. ¡Dios bendecisunki!" :
            "Learn the Bible while playing. God bless you!" }
      ];
      
      let currentStep = 0;
      
      const tutorialDiv = document.createElement('div');
      tutorialDiv.id = 'tutorial';
      tutorialDiv.innerHTML = `
        <div class="tutorial-overlay">
          <div class="tutorial-card">
            <h3 id="tutorial-title">${tutorialSteps[0].title}</h3>
            <p id="tutorial-content">${tutorialSteps[0].content}</p>
            <div class="tutorial-buttons">
              <button id="tutorial-skip">${
                lang === "es" ? "Saltar" :
                lang === "qu" ? "Pawsay" :
                "Skip"
              }</button>
              <button id="tutorial-next">${
                lang === "es" ? "Siguiente" :
                lang === "qu" ? "Qatiq" :
                "Next"
              }</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(tutorialDiv);
      
      const nextBtn = tutorialDiv.querySelector('#tutorial-next');
      const skipBtn = tutorialDiv.querySelector('#tutorial-skip');
      
      nextBtn.onclick = () => {
        currentStep++;
        if (currentStep < tutorialSteps.length) {
          document.getElementById('tutorial-title').textContent = tutorialSteps[currentStep].title;
          document.getElementById('tutorial-content').textContent = tutorialSteps[currentStep].content;
        } else {
          tutorialDiv.remove();
          localStorage.setItem('tutorialShown', 'true');
        }
      };
      
      skipBtn.onclick = () => {
        tutorialDiv.remove();
        localStorage.setItem('tutorialShown', 'true');
      };
    }

    // Cache DOM elements for gift UI
    let giftElements = {};
    function initGiftElements() {
      giftElements.btn = document.getElementById("giftButton");
      giftElements.txt = document.getElementById("giftTimerText");
      giftElements.quickBtn = document.getElementById("homeGiftQuickBtn");
      giftElements.quickBadge = document.getElementById("homeGiftBadge");
    }

    const defaultBgIcons = ["🕊️", "🕊️", "🌥️", "✨", "⭐", "🌟", "☁️", "☁️", "🐑"];
    
    // Iconos bíblicos temáticos para niveles
    const themeIcons = {
      genesis: ["🌍", "✨", "🌿", "🐍", "🍎", "🕊️", "📜", "🌈"],
      exodus: ["🔥", "🌊", "📜", "🍞", "⚡", "🏔️", "🐑", "👑"],
      judges: ["⚔️", "🦁", "🔥", "🏺", "🌪️", "💪", "🎯", "🏆"],
      kings: ["👑", "🏛️", "🎺", "📜", "⚔️", "🏰", "🕊️", "⭐"],
      prophets: ["📖", "🔥", "👁️", "🎺", "⚡", "🌊", "🏜️", "🕊️"],
      jesus: ["⭐", "👶", "🎁", "🕊️", "💧", "🐟", "🍞", "✨"],
      ministry: ["🚶", "🎣", "⛵", "🏔️", "🌊", "👣", "💡", "🙏"],
      passion: ["⛪", "🌿", "⚰️", "✝️", "🪨", "👑", "🔨", "🕊️"],
      acts: ["🔥", "🕊️", "⛵", "🏛️", "🌊", "👥", "🗣️", "⚡"],
      paul: ["✉️", "⛓️", "🚢", "🏛️", "📜", "✨", "🕊️", "❤️"],
      letters: ["📜", "✉️", "🔥", "💎", "🕊️", "⭐", "📖", "✨"],
      revelation: ["👁️", "🐉", "⭐", "🎺", "🏆", "👑", "💎", "🌟"],
      default: ["📖", "✨", "⭐", "🕊️", "🙏", "💡", "🌟", "📜"]
    };
    
    // Función para obtener tema visual según el nivel (1-100)
    function getLevelTheme(levelNum) {
      // Determinar temática según el rango de niveles
      let themeKey = 'default';
      if (levelNum <= 5) themeKey = 'genesis';
      else if (levelNum <= 10) themeKey = 'exodus';
      else if (levelNum <= 15) themeKey = 'judges';
      else if (levelNum <= 20) themeKey = 'kings';
      else if (levelNum <= 25) themeKey = 'prophets';
      else if (levelNum <= 30) themeKey = 'prophets';
      else if (levelNum <= 35) themeKey = 'jesus';
      else if (levelNum <= 40) themeKey = 'ministry';
      else if (levelNum <= 45) themeKey = 'passion';
      else if (levelNum <= 50) themeKey = 'acts';
      else if (levelNum <= 55) themeKey = 'paul';
      else if (levelNum <= 60) themeKey = 'paul';
      else if (levelNum <= 65) themeKey = 'letters';
      else if (levelNum <= 70) themeKey = 'letters';
      else if (levelNum <= 75) themeKey = 'revelation';
      else if (levelNum <= 80) themeKey = 'prophets';
      else if (levelNum <= 85) themeKey = 'letters';
      else if (levelNum <= 90) themeKey = 'letters';
      else if (levelNum <= 95) themeKey = 'letters';
      else themeKey = 'revelation';
      
      const icons = themeIcons[themeKey] || themeIcons.default;
      
      return {
        bgClass: `level-theme-${((levelNum - 1) % 20) + 1}`,
        icons: [...icons, ...icons.slice(0, 1)], // 9 iconos
        floaters: icons.slice(0, 6) // 6 floaters
      };
    }

    let extraQuestions = [];
    let allQuestions = [];

    // Función para mezclar array aleatoriamente (Fisher-Yates)
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    // Diccionario básico para "traducción automática" de términos comunes
    const quDict = {
      "¿Quién": "¿Pin",
      "¿Qué": "¿Ima",
      "¿Dónde": "¿Maypin",
      "¿Cuántos": "¿Hayk'a",
      "¿Cómo": "¿Imayna",
      "hijo": "churi",
      "mujer": "warmi",
      "hombre": "runa",
      "rey": "rey",
      "Dios": "Dios",
      "Jesús": "Jesús",
      "Biblia": "Biblia",
      "fue": "karqan",
      "padre": "tata",
      "madre": "mama"
    };

    function translateToQuechua(text) {
      if (!text) return text;
      let translated = text;
      // Esta es una traducción muy básica para asegurar que nada quede en blanco
      for (const [key, value] of Object.entries(quDict)) {
        const regex = new RegExp(key, "gi");
        translated = translated.replace(regex, value);
      }
      return translated;
    }

    // Carga el banco reducido de preguntas del juego.
    async function loadExtraQuestions() {
      try {
        extraQuestions = [];
        
        // Cargar todos los archivos JSON en paralelo
        const promises = questionFiles.map(async (file) => {
          try {
            const response = await fetch(file);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status} al cargar ${file}`);
            }

            const data = await response.json();
            if (!Array.isArray(data.preguntas)) {
              throw new Error(`Formato inválido en ${file}: falta la lista de preguntas`);
            }

            // Transformar las preguntas al formato que usa el juego.
            return data.preguntas.map(q => ({
              q_es: q.pregunta,
              q_en: q.pregunta_en || q.pregunta,
              q_qu: q.pregunta_qu || translateToQuechua(q.pregunta),
              a_es: [q.opciones.A, q.opciones.B, q.opciones.C, q.opciones.D],
              a_en: [q.opciones_en?.A, q.opciones_en?.B, q.opciones_en?.C, q.opciones_en?.D]
                .map((option, i) => option || [q.opciones.A, q.opciones.B, q.opciones.C, q.opciones.D][i]),
              a_qu: [q.opciones_qu?.A, q.opciones_qu?.B, q.opciones_qu?.C, q.opciones_qu?.D]
                .map((option, i) => option || translateToQuechua([q.opciones.A, q.opciones.B, q.opciones.C, q.opciones.D][i])),
              c: q.respuesta_correcta.charCodeAt(0) - 65, // Convertir A/B/C/D a 0/1/2/3
              ref: q.explicacion.split(' ')[0] || 'Referencia bíblica',
              text_es: q.explicacion,
              text_en: q.explicacion_en || q.explicacion,
              text_qu: q.explicacion_qu || translateToQuechua(q.explicacion),
              topic: q.tema || '',
              lvl: q.nivel // Usar el nivel específico de cada pregunta
            }));
          } catch (err) {
            console.error(`Error cargando ${file}:`, err);
            return [];
          }
        });
        
        const results = await Promise.all(promises);
        extraQuestions = results.flat(); // Combinar todas las preguntas
        
        console.log(`Cargadas ${extraQuestions.length} preguntas de ${questionFiles.length} archivos`);
        
        if (extraQuestions.length > 0) combineAndDistributeQuestions();
        else {
          allQuestions = [];
          console.error('No se pudo cargar el banco reducido de preguntas.');
        }
      } catch (error) {
        console.error('Error cargando el banco de preguntas:', error);
        allQuestions = [];
      }
    }

    // Mantiene seis preguntas en cada uno de los 30 niveles.
    function combineAndDistributeQuestions() {
      allQuestions = extraQuestions.filter(q => q.lvl >= 1 && q.lvl <= MAX_LEVELS);

      const distribution = Array(MAX_LEVELS + 1).fill(0);
      allQuestions.forEach(q => distribution[q.lvl]++);
      const hasExpectedSize = allQuestions.length === MAX_LEVELS * LEVEL_QUESTION_COUNT;
      const hasExpectedLevels = distribution.slice(1).every(count => count === LEVEL_QUESTION_COUNT);

      if (!hasExpectedSize || !hasExpectedLevels) {
        console.error('El banco debe tener seis preguntas en cada uno de los 30 niveles.', distribution);
        allQuestions = [];
        return;
      }

      console.log(`Total: ${allQuestions.length + trueFalseBank.length}/${TOTAL_QUESTION_COUNT} preguntas`);
      console.log('Distribución de preguntas por nivel:', distribution);
    }

    // Cargar el banco al iniciar.
    const questionBankReady = loadExtraQuestions();

    function getQuestionBank() {
      return allQuestions;
    }


    /* ===== LÓGICA ===== */

    function show(id) {
      if (id === "home") {
        if (window.Capacitor?.isNativePlatform?.()) {
          id = "map";
        } else {
          window.location.href = "index.html";
          return;
        }
      }

      document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
      document.getElementById(id).classList.add("active");

      if (id === "home" || id === "modes" || id === "map" || id === "settings" || id === "shop" || id === "achievements" || id === "stats" || id === "extras" || id === "categories") {
        clearLevelVisualTheme();
      }

      // Detener el audio de victoria al salir de la pantalla de felicitación.
      let vAudio = document.getElementById("victoryAudio");
      let birdsAudio = document.getElementById("birdsAudio");
      if (id !== "congrats" && vAudio) {
        if (!vAudio.paused) {
          vAudio.pause();
          vAudio.currentTime = 0;
        }
        if (typeof stopContinuousConfetti === "function") stopContinuousConfetti();
      }

      if (id === "map") {
        if (birdsAudio) {
          const volume = parseFloat(document.getElementById("volume")?.value);
          birdsAudio.volume = Number.isNaN(volume) ? 0.5 : volume;
          birdsAudio.play().catch(e => {});
        }
        updateLocks();
      } else {
        if (birdsAudio && !birdsAudio.paused) {
          birdsAudio.pause();
          birdsAudio.currentTime = 0;
        }
      }
    }

    function detectPerformanceMode() {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 4;
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lowPerfMode = prefersReducedMotion || cores <= 4 || memory <= 4;
      if (lowPerfMode) document.body.classList.add("low-perf");
    }

    function preloadCoreAssets() {
      const preloadText = document.getElementById("preloadText");
      if (preloadText) {
        let text = "Cargando recursos...";
        if (lang === "en") text = "Loading assets...";
        if (lang === "qu") text = "Recursokunata cargashan...";
        preloadText.innerText = text;
      }

      const audioIds = ["correctAudio", "wrongAudio", "victoryAudio", "cueteAudio", "birdsAudio", "clockAudio", "popAudio"];
      const preloadPromises = audioIds.map((id) => new Promise((resolve) => {
        const el = document.getElementById(id);
        if (!el) { resolve(); return; }
        const onReady = () => resolve();
        el.addEventListener("canplaythrough", onReady, { once: true });
        el.addEventListener("error", onReady, { once: true });
        try {
          el.load();
        } catch (e) {
          resolve();
        }
        setTimeout(resolve, 300);
      }));

      return Promise.all(preloadPromises).then(() => {
        const overlay = document.getElementById("preloadOverlay");
        if (overlay) {
          overlay.classList.add("hidden");
          setTimeout(() => { overlay.style.display = "none"; }, 320);
        }
      });
    }

    const onboardingContent = {
      es: [
        { title: "Bienvenido a Trivia Bíblica: Aprende Jugando", body: "Responde preguntas biblicas y gana monedas en cada partida." },
        { title: "Sube de nivel", body: "Necesitas al menos el 70% para avanzar. Completa niveles para desbloquear nuevos retos." },
        { title: "Haz rachas y premios", body: "Acierta seguido para sumar mas monedas y mejorar tu record en supervivencia." }
      ],
      en: [
        { title: "Welcome to Trivia Bíblica: Aprende Jugando", body: "Answer Bible questions and earn coins in every match." },
        { title: "Level up", body: "You need at least 70% to advance. Clear levels to unlock new challenges." },
        { title: "Build streaks and rewards", body: "Get consecutive correct answers for more coins and a better survival record." }
      ]
    };

    function renderOnboardingStep() {
      const steps = onboardingContent[lang] || onboardingContent.es;
      const step = steps[onboardingStep];
      document.getElementById("onboardingTitle").innerText = step.title;
      document.getElementById("onboardingBody").innerText = step.body;
      document.querySelectorAll(".onboarding-dot").forEach((dot, idx) => {
        dot.classList.toggle("active", idx === onboardingStep);
      });
      let nextText = "Siguiente";
      if (lang === "en") nextText = "Next";
      if (lang === "qu") nextText = "Qatiq";

      let startText = "Empezar";
      if (lang === "en") startText = "Start";
      if (lang === "qu") startText = "Qallariy";

      let skipText = "Saltar";
      if (lang === "en") skipText = "Skip";
      if (lang === "qu") skipText = "Pawsay";

      document.getElementById("onboardingNextBtn").innerText = onboardingStep === steps.length - 1 ? startText : nextText;
      document.getElementById("onboardingSkipBtn").innerText = skipText;
    }

    function closeOnboarding() {
      localStorage.setItem('hasSeenOnboarding', '1');
      document.getElementById("onboardingModal").style.display = "none";
    }

    function initOnboarding() {
      localStorage.setItem('hasSeenOnboarding', '1');
      return; // Onboarding deshabilitado
      if (hasSeenOnboarding) return;
      onboardingStep = 0;
      renderOnboardingStep();
      document.getElementById("onboardingModal").style.display = "flex";

      document.getElementById("onboardingNextBtn").onclick = () => {
        const steps = onboardingContent[lang] || onboardingContent.es;
        if (onboardingStep >= steps.length - 1) {
          closeOnboarding();
          return;
        }
        onboardingStep++;
        renderOnboardingStep();
      };
      document.getElementById("onboardingSkipBtn").onclick = closeOnboarding;
    }

    function toggleLang() {
      const m = document.getElementById("langMenu");
      m.style.display = m.style.display === "block" ? "none" : "block";
    }

    function setLang(l) {
      lang = l;
      localStorage.setItem('lang', l);
      document.documentElement.lang = l;
      const titleEl = document.getElementById("title");
      if (titleEl) {
        titleEl.innerText = 
          lang === "es" ? "🗺️ Selecciona un Nivel" : 
          lang === "en" ? "🗺️ Select a Level" :
          "🗺️ Nivelta akllay";
      }
      updateHomeTexts();
      updateLevelPreviewText();
      updateLifelineLabels();
      updateLocks();
      updateCurrentQuestionLanguage();
    }

    function getLocalizedQuestionText(question) {
      if (lang === "en") return question.q_en || question.q_es;
      if (lang === "qu") return question.q_qu || translateToQuechua(question.q_es);
      return question.q_es;
    }

    function getLocalizedAnswers(question) {
      if (lang === "en") return question.a_en || question.a_es;
      if (lang === "qu") return question.a_qu || question.a_es.map(translateToQuechua);
      return question.a_es;
    }

    function getLocalizedExplanation(question) {
      if (lang === "en") return question.text_en || question.text_es;
      if (lang === "qu") return question.text_qu || translateToQuechua(question.text_es);
      return question.text_es;
    }

    function updateCurrentQuestionLanguage() {
      const quiz = document.getElementById("quiz");
      if (!quiz?.classList.contains("active") || !questions[index]) return;

      const question = questions[index];
      document.getElementById("q").innerText = getLocalizedQuestionText(question);
      const answerButtons = document.querySelectorAll("#a .answer");
      const localizedAnswers = getLocalizedAnswers(question);
      answerButtons.forEach((button, buttonIndex) => {
        const optionIndex = displayedAnswerOptionIndexes[buttonIndex];
        if (optionIndex !== undefined) {
          button.innerText = localizedAnswers[optionIndex];
        }
      });

      const verse = document.getElementById("verse");
      if (verse.classList.contains("show")) {
        verse.innerHTML = "<strong>📖 " + question.ref + "</strong>" + getLocalizedExplanation(question);
      }
    }

    function updateHomeTexts() {
      // Home elements
      const playBtn = document.getElementById("homePlayBtn");
      const extrasBtn = document.getElementById("homeExtrasBtn");
      const dailyLabel = document.getElementById("homeDailyLabel");
      const homeGiftQuickBtn = document.getElementById("homeGiftQuickBtn");

      // Extras elements
      const extrasTitle = document.getElementById("extrasTitle");
      const extrasSubtitle = document.getElementById("extrasSubtitle");
      const extrasDivider = document.getElementById("extrasDivider");
      const extrasShopBtn = document.getElementById("extrasShopBtn");
      const extrasAchievementsBtn = document.getElementById("extrasAchievementsBtn");
      const extrasStatsBtn = document.getElementById("extrasStatsBtn");
      const extrasBackBtn = document.getElementById("extrasBackBtn");
      const giftButton = document.getElementById("giftButton");

      // Settings elements
      const settingsTitle = document.getElementById("settingsTitle");
      const settingsDivider = document.getElementById("settingsDivider");
      const volumeLabel = document.getElementById("volumeLabel");
      const langLabel = document.getElementById("langLabel");
      const ageLabel = document.getElementById("ageLabel");
      const optKids = document.getElementById("optKids");
      const optTeen = document.getElementById("optTeen");
      const optAdult = document.getElementById("optAdult");
      const resetBtn = document.getElementById("resetBtn");
      const settingsBackBtn = document.getElementById("settingsBackBtn");

      // Categories elements
      const categoriesTitle = document.getElementById("categoriesTitle");
      const categoriesSubtitle = document.getElementById("categoriesSubtitle");
      const categoriesDivider = document.getElementById("categoriesDivider");
      const catOldTitle = document.getElementById("catOldTitle");
      const catOldDesc = document.getElementById("catOldDesc");
      const catOldBadge = document.getElementById("catOldBadge");
      const catNewTitle = document.getElementById("catNewTitle");
      const catNewDesc = document.getElementById("catNewDesc");
      const catNewBadge = document.getElementById("catNewBadge");
      const catCharTitle = document.getElementById("catCharTitle");
      const catCharDesc = document.getElementById("catCharDesc");
      const catCharBadge = document.getElementById("catCharBadge");
      const catTFTitle = document.getElementById("catTFTitle");
      const catTFDesc = document.getElementById("catTFDesc");
      const catTFBadge = document.getElementById("catTFBadge");
      const categoriesBackBtn = document.getElementById("categoriesBackBtn");

      // Shop elements
      const shopTitle = document.getElementById("shopTitle");
      const shopSubtitle = document.getElementById("shopSubtitle");
      const shopBackBtn = document.getElementById("shopBackBtn");

      // Achievements elements
      const achievementsTitle = document.getElementById("achievementsTitle");
      const achievementsSubtitle = document.getElementById("achievementsSubtitle");
      const achievementsBackBtn = document.getElementById("achievementsBackBtn");

      // Stats elements
      const statsTitle = document.getElementById("statsTitle");
      const statsSubtitle = document.getElementById("statsSubtitle");
      const statsBackBtn = document.getElementById("statsBackBtn");

      // Update Home
      if (playBtn) playBtn.innerText = 
        lang === "es" ? "🎮 ¡Jugar!" :
        lang === "en" ? "🎮 Play!" :
        "🎮 Pukllay!";
      if (extrasBtn) extrasBtn.innerText = 
        lang === "es" ? "✨ Extras" :
        lang === "en" ? "✨ Extras" :
        "✨ Yapamanta";
      if (dailyLabel) dailyLabel.innerText = 
        lang === "es" ? "📜 Texto de Hoy" :
        lang === "en" ? "📜 Today's Text" :
        "📜 P'unchaypa Qillqan";
      if (homeGiftQuickBtn) homeGiftQuickBtn.title = 
        lang === "es" ? "Abrir regalo" : 
        lang === "en" ? "Open gift" :
        "Regaluta kichay";

      // Update Extras
      if (extrasTitle) extrasTitle.innerText = 
        lang === "es" ? "✨ Extras" :
        lang === "en" ? "✨ Extras" :
        "✨ Yapamanta";
      if (extrasSubtitle) extrasSubtitle.innerText = 
        lang === "es" ? "Accesos especiales" :
        lang === "en" ? "Special access" :
        "Sapaq yaykuy";
      if (extrasDivider) extrasDivider.innerText = 
        lang === "es" ? "⭐ contenido extra ⭐" :
        lang === "en" ? "⭐ extra content ⭐" :
        "⭐ yapamanta willay ⭐";
      if (extrasShopBtn) extrasShopBtn.innerText = 
        lang === "es" ? "🛍️ Tienda" :
        lang === "en" ? "🛍️ Shop" :
        "🛍️ Qhatu";
      if (extrasAchievementsBtn) extrasAchievementsBtn.innerText = 
        lang === "es" ? "🏅 Trofeos" :
        lang === "en" ? "🏅 Trophies" :
        "🏅 Atipaykuna";
      if (extrasStatsBtn) extrasStatsBtn.innerText = 
        lang === "es" ? "📊 Datos" :
        lang === "en" ? "📊 Stats" :
        "📊 Willaykuna";
      if (extrasBackBtn) extrasBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Settings
      if (settingsTitle) settingsTitle.innerText = 
        lang === "es" ? "⚙️ Ajustes" :
        lang === "en" ? "⚙️ Settings" :
        "⚙️ Allichay";
      if (settingsDivider) settingsDivider.innerText = 
        lang === "es" ? "🎵 opciones 🎵" :
        lang === "en" ? "🎵 options 🎵" :
        "🎵 akllanakuna 🎵";
      if (volumeLabel) volumeLabel.innerText = 
        lang === "es" ? "🔊 Volumen de efectos" :
        lang === "en" ? "🔊 Effects volume" :
        "🔊 Kunka uyarikuna";
      if (langLabel) langLabel.innerText = 
        lang === "es" ? "🌐 Idioma" :
        lang === "en" ? "🌐 Language" :
        "🌐 Rimay";
      if (ageLabel) ageLabel.innerText = 
        lang === "es" ? "👧🧒 Dificultad por edades" :
        lang === "en" ? "👧🧒 Age difficulty" :
        "👧🧒 Watakunaman sasa kay";
      if (optKids) optKids.innerText = 
        lang === "es" ? "Niños (más tiempo)" :
        lang === "en" ? "Kids (more time)" :
        "Erqekuna (aswan pacha)";
      if (optTeen) optTeen.innerText = 
        lang === "es" ? "Jóvenes (normal)" :
        lang === "en" ? "Teens (normal)" :
        "Waynakuna (normal)";
      if (optAdult) optAdult.innerText = 
        lang === "es" ? "Adultos (más difícil)" :
        lang === "en" ? "Adults (harder)" :
        "Kuraq runakuna (aswan sasa)";
      if (resetBtn) resetBtn.innerText = 
        lang === "es" ? "🗑️ Reiniciar Progreso" :
        lang === "en" ? "🗑️ Reset Progress" :
        "🗑️ Tukuyta qallariy";
      if (settingsBackBtn) settingsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Categories
      if (categoriesTitle) categoriesTitle.innerText = 
        lang === "es" ? "📚 Categorías" :
        lang === "en" ? "📚 Categories" :
        "📚 Categoríakunawan";
      if (categoriesSubtitle) categoriesSubtitle.innerText = 
        lang === "es" ? "Elige un tema bíblico" :
        lang === "en" ? "Choose a Bible topic" :
        "Bibliamanta temata akllay";
      if (categoriesDivider) categoriesDivider.innerText = 
        lang === "es" ? "⭐ selecciona ⭐" :
        lang === "en" ? "⭐ select ⭐" :
        "⭐ akllay ⭐";
      if (catOldTitle) catOldTitle.innerText = 
        lang === "es" ? "Antiguo Testamento" :
        lang === "en" ? "Old Testament" :
        "Ñawpaq Testamento";
      if (catOldDesc) catOldDesc.innerText = 
        lang === "es" ? "Desde Génesis hasta Malaquías" :
        lang === "en" ? "From Genesis to Malachi" :
        "Génesismanta Malaquías-kama";
      if (catOldBadge) catOldBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catNewTitle) catNewTitle.innerText = 
        lang === "es" ? "Nuevo Testamento" :
        lang === "en" ? "New Testament" :
        "Musuq Testamento";
      if (catNewDesc) catNewDesc.innerText = 
        lang === "es" ? "Desde Mateo hasta Apocalipsis" :
        lang === "en" ? "From Matthew to Revelation" :
        "Mateomanta Apocalipsis-kama";
      if (catNewBadge) catNewBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catCharTitle) catCharTitle.innerText = 
        lang === "es" ? "Personajes Bíblicos" :
        lang === "en" ? "Bible Characters" :
        "Bibliamanta Runakuna";
      if (catCharDesc) catCharDesc.innerText = 
        lang === "es" ? "Conoce a los héroes de la fe" :
        lang === "en" ? "Meet the heroes of faith" :
        "Iñiypa héroenkuna reqsiy";
      if (catCharBadge) catCharBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catTFTitle) catTFTitle.innerText = 
        lang === "es" ? "Verdadero o Falso" :
        lang === "en" ? "True or False" :
        "Chiqap o Llullap";
      if (catTFDesc) catTFDesc.innerText = 
        lang === "es" ? "¿Puedes distinguir la verdad?" :
        lang === "en" ? "Can you tell the truth?" :
        "¿Chiqapta yachawaqchu?";
      if (catTFBadge) catTFBadge.innerText = 
        lang === "es" ? "30 preguntas" :
        lang === "en" ? "30 questions" :
        "30 tapukuykuna";
      if (categoriesBackBtn) categoriesBackBtn.innerText = 
        lang === "es" ? "🏠 Regresar al menú principal" :
        lang === "en" ? "🏠 Back to main menu" :
        "🏠 Ñawpaq menuman kutiy";

      // Update Shop
      if (shopTitle) shopTitle.innerText = 
        lang === "es" ? "🛍️ Tienda" :
        lang === "en" ? "🛍️ Shop" :
        "🛍️ Qhatu";
      if (shopSubtitle) shopSubtitle.innerText = 
        lang === "es" ? "Usa tus monedas ahorradas" :
        lang === "en" ? "Use your saved coins" :
        "Qollqiykiwan rantiy";
      if (shopBackBtn) shopBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Achievements
      if (achievementsTitle) achievementsTitle.innerText = 
        lang === "es" ? "🏅 Trofeos" :
        lang === "en" ? "🏅 Trophies" :
        "🏅 Atipaykuna";
      if (achievementsSubtitle) achievementsSubtitle.innerText = 
        lang === "es" ? "Demuestra tu habilidad" :
        lang === "en" ? "Show your skill" :
        "Yachayniykita qawachiy";
      if (achievementsBackBtn) achievementsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Stats
      if (statsTitle) statsTitle.innerText = 
        lang === "es" ? "📊 Estadísticas" :
        lang === "en" ? "📊 Stats" :
        "📊 Willaykuna";
      if (statsSubtitle) statsSubtitle.innerText = 
        lang === "es" ? "Progreso General" :
        lang === "en" ? "Overall Progress" :
        "Tukuy puriy";
      if (statsBackBtn) statsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";
    }

    function setAgeDifficulty(val) {
      ageDifficulty = val || 'teen';
      localStorage.setItem('ageDifficulty', ageDifficulty);
      updateLifelineLabels();
    }

    function getDifficultyConfig() {
      if (ageDifficulty === 'kids') {
        return { baseTime: 19, coinMult: 0.9, costs: { fifty: 14, time: 8, hint: 6, skip: 10 } };
      }
      if (ageDifficulty === 'adult') {
        return { baseTime: 13, coinMult: 1.25, costs: { fifty: 24, time: 14, hint: 12, skip: 18 } };
      }
      return { baseTime: 15, coinMult: 1.0, costs: { fifty: 20, time: 10, hint: 8, skip: 12 } };
    }

    function updateLifelineLabels() {
      const cfg = getDifficultyConfig();
      baseTime = cfg.baseTime;
      const fiftyBtn = document.getElementById("fiftyBtn");
      const timeBtn = document.getElementById("timeBtn");
      const hintBtn = document.getElementById("hintBtn");
      const skipBtn = document.getElementById("skipBtn");
      if (fiftyBtn) fiftyBtn.innerText = `50/50 (${cfg.costs.fifty}🪙)`;
      if (timeBtn) timeBtn.innerText = `+10s (${cfg.costs.time}🪙)`;
      if (hintBtn) hintBtn.innerText = 
        lang === "en" ? `💡 Hint (${cfg.costs.hint}🪙)` :
        lang === "qu" ? `💡 Willay (${cfg.costs.hint}🪙)` :
        `💡 Pista (${cfg.costs.hint}🪙)`;
      if (skipBtn) skipBtn.innerText = 
        lang === "en" ? `⏭️ Skip (${cfg.costs.skip}🪙)` :
        lang === "qu" ? `⏭️ Pawsay (${cfg.costs.skip}🪙)` :
        `⏭️ Saltar (${cfg.costs.skip}🪙)`;

      const sel = document.getElementById("ageDifficulty");
      if (sel) sel.value = ageDifficulty;
    }

    function updateVolume(val) {
      const volume = parseFloat(val);
      ["correctAudio", "wrongAudio", "victoryAudio", "cueteAudio", "birdsAudio", "clockAudio", "popAudio"]
        .forEach(id => {
          const audio = document.getElementById(id);
          if (audio) audio.volume = volume;
        });

      if (volume > 0) {
        soundMuted = false;
        lastVolumeBeforeMute = volume;
        localStorage.setItem('lastVolumeBeforeMute', String(lastVolumeBeforeMute));
      } else {
        soundMuted = true;
      }

      localStorage.setItem('soundMuted', soundMuted ? '1' : '0');
      localStorage.setItem('volume', String(volume));
      updateSoundToggleUI();
    }

    function updateSoundToggleUI() {
      const btn = document.getElementById("soundToggle");
      if (!btn) return;
      btn.innerText = soundMuted ? "🔇" : "🔊";
      btn.title = soundMuted ? "Activar sonido" : "Desactivar sonido";
    }

    function toggleSound() {
      const volumeSlider = document.getElementById("volume");

      if (soundMuted) {
        const restoreVolume = lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.5;
        if (volumeSlider) volumeSlider.value = restoreVolume;
        updateVolume(restoreVolume);
      } else {
        const currentVolume = volumeSlider ? parseFloat(volumeSlider.value) : parseFloat(localStorage.getItem('volume')) || 0.5;
        if (currentVolume > 0) {
          lastVolumeBeforeMute = currentVolume;
          localStorage.setItem('lastVolumeBeforeMute', String(lastVolumeBeforeMute));
        }
        if (volumeSlider) volumeSlider.value = 0;
        updateVolume(0);
      }
    }

    function startGame() {
      let vol = document.getElementById("volume").value;
      updateVolume(vol);

      isSurvival = false;
      isCategoryMode = false;
      
      // Aseguramos que se limpie cualquier estado previo de preguntas
      questions = [];
      index = 0;
      
      show("map");
      updateLocks();
    }

    function showModes() {
      show("modes");
    }

    const modeTutorialContent = {
      story: {
        es: {
          title: "📖 Modo Historia",
          body: "Avanza por niveles. Necesitas al menos el 70% para desbloquear el siguiente nivel.",
          tips: ["🗺️ Elige un nivel en el mapa", "⭐ Responde 6 preguntas", "🪙 Ganas monedas por tus aciertos"]
        },
        en: {
          title: "📖 Story Mode",
          body: "Advance through levels. You need at least 70% to unlock the next level.",
          tips: ["🗺️ Pick a level on the map", "⭐ Answer 6 questions", "🪙 Earn coins for correct answers"]
        },
        qu: {
          title: "📖 Ñawpaq Willay",
          body: "Niveltakama puriy. Aswan 70% allin kutichiy qatiq nivelta kichanapaq.",
          tips: ["🗺️ Mapapi nivelta akllay", "⭐ 6 tapukuykunata kutichiy", "🪙 Allin kutichisqaykimanta qullqita chaskinki"]
        }
      },
      survival: {
        es: {
          title: "🔥 Supervivencia",
          body: "Juega sin parar hasta quedarte sin vidas. ¡Haz la mejor racha posible!",
          tips: ["❤️ Tienes 3 vidas", "🔥 Suma puntos por cada acierto", "🏆 Intenta romper tu récord"]
        },
        en: {
          title: "🔥 Survival",
          body: "Play nonstop until you run out of lives. Build the best streak you can!",
          tips: ["❤️ You have 3 lives", "🔥 Score points for every correct answer", "🏆 Try to beat your record"]
        },
        qu: {
          title: "🔥 Kawsay",
          body: "Pukllay mana saykuspa kawsayniyki tukunankama. ¡Aswan allin rachata ruway!",
          tips: ["❤️ 3 kawsayniyuq kanki", "🔥 Sapa allin kutichisqaykimanta puntukunata chaskinki", "🏆 Récordniykita atipayta munay"]
        }
      },
      categories: {
        es: {
          title: "📚 Por Categorías",
          body: "Juega por temas bíblicos. ¡Elige tu categoría favorita y demuestra lo que sabes!",
          tips: ["📜 Antiguo Testamento", "📖 Nuevo Testamento", "👑 Personajes Bíblicos", "✅❌ Verdadero o Falso"]
        },
        en: {
          title: "📚 By Categories",
          body: "Play by Bible topics. Choose your favorite category and show what you know!",
          tips: ["📜 Old Testament", "📖 New Testament", "👑 Biblical Characters", "✅❌ True or False"]
        },
        qu: {
          title: "📚 Categoríakunawan",
          body: "Bibliamanta temakunawan pukllay. ¡Aswan munasqayki categoriata akllay hinaspa yachasqaykita qawachiy!",
          tips: ["📜 Ñawpaq Testamento", "📖 Musuq Testamento", "👑 Bibliamanta Runakuna", "✅❌ Chiqap o Llullap"]
        }
      }
    };

    function openModeTutorial(modeKey) {
      const modal = document.getElementById("modeModal");
      const titleEl = document.getElementById("modeTitle");
      const bodyEl = document.getElementById("modeBody");
      const tipsEl = document.getElementById("modeTips");
      const playBtn = document.getElementById("modePlayBtn");

      const mode = modeTutorialContent[modeKey] || modeTutorialContent.story;
      let t = mode.es;
      if (lang === "en") t = mode.en;
      if (lang === "qu") t = mode.qu;

      titleEl.innerText = t.title;
      bodyEl.innerText = t.body;
      tipsEl.innerHTML = t.tips.map(x => `<div style="margin:4px 0;">${x}</div>`).join("");

      if (lang === "en") playBtn.innerText = "✅ Start";
      else if (lang === "qu") playBtn.innerText = "✅ Qallariy";
      else playBtn.innerText = "✅ Empezar";

      playBtn.onclick = () => {
        closeModeTutorial();
        if (modeKey === "survival") startSurvival();
        else if (modeKey === "categories") show("categories");
        else startGame();
      };

      modal.style.display = "flex";
    }

    function closeModeTutorial() {
      const modal = document.getElementById("modeModal");
      if (modal) modal.style.display = "none";
    }

    function showSettings() {
      show("settings");
    }

    function formatGiftTime(ms) {
      const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function getGiftRemainingMs() {
      const now = Date.now();
      return Math.max(0, giftCooldownMs - (now - lastGiftClaimTs));
    }

    function updateGiftUI(lastRewardMessage) {
      const remaining = getGiftRemainingMs();
      if (remaining <= 0) {
        if (giftElements.btn) {
          giftElements.btn.disabled = false;
          giftElements.btn.innerText = 
            lang === "es" ? "🎁 Regalo listo" : 
            lang === "en" ? "🎁 Gift ready" :
            "🎁 Regalun listo";
        }
        if (giftElements.txt) {
          if (lang === "es") {
            giftElements.txt.innerText = `Listo para reclamar${survivalBonusLives > 0 ? ` · ❤️ extra: ${survivalBonusLives}` : ""}`;
          } else if (lang === "en") {
            giftElements.txt.innerText = `Ready to claim${survivalBonusLives > 0 ? ` · Extra ❤️: ${survivalBonusLives}` : ""}`;
          } else {
            giftElements.txt.innerText = `Reclamanapaq listo${survivalBonusLives > 0 ? ` · ❤️ yapamanta: ${survivalBonusLives}` : ""}`;
          }
        }
        if (giftElements.quickBtn) {
          giftElements.quickBtn.classList.add("ready");
        }
        if (giftElements.quickBadge) giftElements.quickBadge.innerText = "!";
      } else {
        if (giftElements.btn) {
          giftElements.btn.disabled = true;
          giftElements.btn.innerText = 
            lang === "es" ? "🎁 Regalo" : 
            lang === "en" ? "🎁 Gift" :
            "🎁 Regalu";
        }
        if (giftElements.txt) {
          let t = "";
          if (lang === "es") t = `Próximo regalo en ${formatGiftTime(remaining)}`;
          else if (lang === "en") t = `Next gift in ${formatGiftTime(remaining)}`;
          else t = `Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
          
          giftElements.txt.innerText = t + (survivalBonusLives > 0 ? ` · ❤️ ${survivalBonusLives}` : "");
        }
        if (giftElements.quickBtn) {
          giftElements.quickBtn.classList.remove("ready");
        }
        if (giftElements.quickBadge) giftElements.quickBadge.innerText = formatGiftTime(remaining);
      }

      if (lastRewardMessage && giftElements.txt) {
        giftElements.txt.innerText = lastRewardMessage;
      }
    }

    function openGiftFromHome() {
      const remaining = getGiftRemainingMs();
      if (remaining <= 0) {
        claimTimedGift();
      } else {
        let waitMsg = "";
        if (lang === "es") waitMsg = `⏳ Próximo regalo en ${formatGiftTime(remaining)}`;
        else if (lang === "en") waitMsg = `⏳ Next gift in ${formatGiftTime(remaining)}`;
        else waitMsg = `⏳ Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
        
        showGiftRewardToast(waitMsg);
        showConfetti(50, 38);
      }
    }

    function claimTimedGift() {
      console.log("claimTimedGift called");
      const remaining = getGiftRemainingMs();
      console.log("Remaining time:", remaining);
      if (remaining > 0) {
        console.log("Gift not ready yet, remaining:", remaining);
        let waitMsg = "";
        if (lang === "es") waitMsg = `⏳ Próximo regalo en ${formatGiftTime(remaining)}`;
        else if (lang === "en") waitMsg = `⏳ Next gift in ${formatGiftTime(remaining)}`;
        else waitMsg = `⏳ Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
        
        showGiftRewardToast(waitMsg);
        return;
      }

      let rewardMessage = "";
      if (Math.random() < 0.72) {
        const rewardCoins = Math.floor(Math.random() * 13) + 8; // 8-20
        coins += rewardCoins;
        localStorage.setItem('coins', coins);
        if (lang === "es") rewardMessage = `🎉 Recibiste +${rewardCoins} monedas`;
        else if (lang === "en") rewardMessage = `🎉 You got +${rewardCoins} coins`;
        else rewardMessage = `🎉 Chaskinki +${rewardCoins} qullqita`;
      } else {
        survivalBonusLives += 1;
        localStorage.setItem('survivalBonusLives', survivalBonusLives);
        if (lang === "es") rewardMessage = "❤️ Ganaste +1 corazón para tu próxima supervivencia";
        else if (lang === "en") rewardMessage = "❤️ You got +1 heart for your next survival run";
        else rewardMessage = "❤️ Chaskinki +1 sunquuta qatiq kawsaypaq";
      }

      lastGiftClaimTs = Date.now();
      localStorage.setItem('lastGiftClaimTs', String(lastGiftClaimTs));
      updateLocks();
      updateGiftUI(rewardMessage);
      showGiftRewardToast(rewardMessage);
      showConfetti(50, 42);
    }

    function showGiftRewardToast(message) {
      const toast = document.getElementById("giftToast");
      if (!toast) return;
      toast.innerText = message;
      toast.classList.remove("show");
      void toast.offsetWidth;
      toast.classList.add("show");
    }

    async function startLevel(l) {
      console.log("startLevel called with level:", l, "unlocked:", unlocked);
      if (l < 1 || l > MAX_LEVELS || l > unlocked) {
        console.log("Level locked, returning");
        return;
      }
      await questionBankReady;
      clearTimeout(answerTransitionTimer);
      
      isSurvival = false;
      isCategoryMode = false;
      applyLevelVisualTheme(l);
      level = l;
      index = 0;
      score = 0;
      combo = 0;
      
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "none";
      document.getElementById("lifelines").style.display = "flex";
      updateLifelineLabels();
      document.getElementById("quizCoins").innerText = coins;

      // Filtrar preguntas no usadas aún y acordes a la dificultad del nivel
      let currentBank = getQuestionBank();
      if (currentBank.length === 0) {
        alert(lang === "en" ? "Questions could not be loaded. Please reload the game." :
          lang === "qu" ? "Tapukuykunata mana cargarqankuchu. Pukllayta musuqmanta kichay." :
          "No se pudieron cargar las preguntas. Recarga el juego.");
        return;
      }
      let available = currentBank.map((q, i) => i).filter(i => !usedQuestionIndices.has(i) && currentBank[i].lvl === level);

      // Reiniciar el uso de preguntas cuando ya se jugaron todas las del nivel.
      if (available.length < LEVEL_QUESTION_COUNT) {
        let levelIndices = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl === level);
        levelIndices.forEach(idx => usedQuestionIndices.delete(idx));
        available = currentBank.map((q, i) => i).filter(i => !usedQuestionIndices.has(i) && currentBank[i].lvl === level);
      }

      if (available.length < LEVEL_QUESTION_COUNT) {
        available = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl === level);
      }

      // Mezclar las seis preguntas del nivel.
      let shuffledIndices = shuffle([...available]);
      let picked = shuffledIndices.slice(0, LEVEL_QUESTION_COUNT);

      // Marcar como usadas
      picked.forEach(i => usedQuestionIndices.add(i));

      questions = picked.map(i => getQuestionBank()[i]);
      
      if (questions.length !== LEVEL_QUESTION_COUNT) {
        console.error(`ERROR: No hay preguntas para el nivel ${level}`);
        alert(`Error: No se encontraron preguntas para el nivel ${level}. Por favor recarga la página.`);
        return;
      }

      show("quiz");
      nextQ();
    }

    /* ===== CATEGORY MODE ===== */
    let isCategoryMode = false;
    let currentCategory = '';

    // Category question indices
    // True/False question bank
    const trueFalseBank = [
      { q_es: "¿Adán y Eva comieron del árbol de la vida?", q_en: "Did Adam and Eve eat from the tree of life?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Génesis 3:6", text_es: "Comieron del árbol del bien y del mal, no de la vida.", text_en: "They ate from the tree of good and evil, not of life." },
      { q_es: "¿Noé llevó dos de cada animal al arca?", q_en: "Did Noah take two of each animal on the ark?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 7:15", text_es: "Dos de cada especie entraron al arca.", text_en: "Two of every kind entered the ark." },
      { q_es: "¿Abraham tenía 100 años cuando nació Isaac?", q_en: "Was Abraham 100 years old when Isaac was born?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 21:5", text_es: "Abraham tenía 100 años.", text_en: "Abraham was 100 years old." },
      { q_es: "¿Moisés partió el Mar Rojo en dos?", q_en: "Did Moses split the Red Sea in two?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Éxodo 14:21", text_es: "Las aguas se dividieron.", text_en: "The waters were divided." },
      { q_es: "¿David era hijo de Saúl?", q_en: "Was David the son of Saul?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "1 Samuel 17:12", text_es: "David era hijo de Isaí, no de Saúl.", text_en: "David was son of Jesse, not Saul." },
      { q_es: "¿Salomón construyó el primer templo?", q_en: "Did Solomon build the first temple?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "1 Reyes 6:1", text_es: "Salomón comenzó a edificar el templo.", text_en: "Solomon began to build the temple." },
      { q_es: "¿Jonás fue envuelto por una ballena?", q_en: "Was Jonah swallowed by a whale?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Jonás 1:17", text_es: "Un gran pez, no específicamente ballena.", text_en: "A great fish, not specifically a whale." },
      { q_es: "¿Jesús nació en Nazaret?", q_en: "Was Jesus born in Nazareth?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Mateo 2:1", text_es: "Jesús nació en Belén, no Nazaret.", text_en: "Jesus was born in Bethlehem, not Nazareth." },
      { q_es: "¿Jesús tuvo 12 apóstoles?", q_en: "Did Jesus have 12 apostles?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 10:1", text_es: "Llamó a sus doce discípulos.", text_en: "He called his twelve disciples." },
      { q_es: "¿Pedro negó a Jesús tres veces?", q_en: "Did Peter deny Jesus three times?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 26:75", text_es: "Pedro lo negó tres veces.", text_en: "Peter denied him three times." },
      { q_es: "¿Pablo era uno de los doce apóstoles originales?", q_en: "Was Paul one of the original twelve apostles?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Hechos 9:3-6", text_es: "Pablo fue llamado después, no era de los doce.", text_en: "Paul was called later, not among the twelve." },
      { q_es: "¿Jesús resucitó a Lázaro de los muertos?", q_en: "Did Jesus raise Lazarus from the dead?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Juan 11:43-44", text_es: "Lázaro salió de la tumba.", text_en: "Lazarus came out of the tomb." },
      { q_es: "¿La Biblia tiene 66 libros en total?", q_en: "Does the Bible have 66 books in total?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Canon bíblico", text_es: "39 en el AT y 27 en el NT = 66 libros.", text_en: "39 in OT and 27 in NT = 66 books." },
      { q_es: "¿Moisés escribió los Salmos?", q_en: "Did Moses write the Psalms?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Salmos", text_es: "David escribió la mayoría, no Moisés.", text_en: "David wrote most of them, not Moses." },
      { q_es: "¿Jesús caminó sobre el agua?", q_en: "Did Jesus walk on water?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 14:25", text_es: "Jesús caminó sobre las aguas.", text_en: "Jesus walked on the sea." },
      { q_es: "¿Satanás tentó a Eva en el jardín?", q_en: "Did Satan tempt Eve in the garden?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Génesis 3:1", text_es: "La serpiente (no especificado como Satanás en Génesis).", text_en: "The serpent (not specified as Satan in Genesis)." },
      { q_es: "¿El diluvio duró 40 días y 40 noches?", q_en: "Did the flood last 40 days and 40 nights?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 7:12", text_es: "Llovió 40 días y 40 noches.", text_en: "It rained 40 days and 40 nights." },
      { q_es: "¿Caín mató a su hermano Abel?", q_en: "Did Cain kill his brother Abel?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 4:8", text_es: "Caín atacó a su hermano Abel.", text_en: "Cain attacked his brother Abel." },
      { q_es: "¿José fue vendido como esclavo por sus hermanos?", q_en: "Was Joseph sold as a slave by his brothers?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 37:28", text_es: "Sus hermanos lo vendieron por 20 piezas de plata.", text_en: "His brothers sold him for 20 pieces of silver." },
      { q_es: "¿El Arca de la Alianza contenía los diez mandamientos?", q_en: "Did the Ark of the Covenant contain the Ten Commandments?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Hebreos 9:4", text_es: "Contenía las tablas del pacto.", text_en: "It contained the tablets of the covenant." },
    ];

    function shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    }

    function getPassingScore(total = questions.length) {
      return Math.ceil(total * 0.7);
    }

    function getEarnedStars(currentScore, total = questions.length) {
      if (currentScore >= total) return 3;
      if (currentScore >= Math.ceil(total * 0.85)) return 2;
      return currentScore >= getPassingScore(total) ? 1 : 0;
    }

    function applyLevelVisualTheme(levelNum) {
      clearLevelVisualTheme();
      const theme = getLevelTheme(levelNum);
      document.body.classList.add(theme.bgClass);
      updateFloatingDecor(theme.icons, theme.floaters);
    }

    function clearLevelVisualTheme() {
      document.body.classList.forEach(className => {
        if (className.startsWith("level-theme-")) {
          document.body.classList.remove(className);
        }
      });
      updateFloatingDecor(defaultBgIcons, ["📜", "🕊️", "⭐", "🪔", "📖", "🌿"]);
    }

    function updateFloatingDecor(iconSet, floaterSet) {
      document.querySelectorAll(".global-bg-icons .bg-icon").forEach((icon, index) => {
        icon.textContent = iconSet[index] || defaultBgIcons[index] || "✨";
      });
      document.querySelectorAll(".level-floaters .level-floater").forEach((floater, index) => {
        floater.textContent = floaterSet[index] || "✨";
      });
    }

    function generateDynamicLevels() {
      const container = document.querySelector(".level-path-buttons");
      if (!container) return;

      const leftPositions = [27, 62, 40, 72, 54, 86, 75, 50, 28, 15, 50, 78, 84, 62, 38];
      for (let i = 16; i <= MAX_LEVELS; i++) {
        if (document.getElementById(`lvlPin${i}`)) continue;

        const pin = document.createElement("div");
        pin.className = `level-pin level-block-${Math.ceil(i / 5)}`;
        pin.id = `lvlPin${i}`;
        pin.innerHTML = `
          <div class="level locked" id="lvl${i}">${i}</div>
          <span class="lock-badge" id="lock${i}">🔒</span>
          <div class="stars-container" id="stars${i}"></div>
        `;
        container.appendChild(pin);
      }

      for (let i = 1; i <= MAX_LEVELS; i++) {
        const pin = document.getElementById(`lvlPin${i}`);
        if (!pin) continue;
        pin.style.top = `${1 + (i - 1) * (88 / (MAX_LEVELS - 1))}%`;
        pin.style.left = `${leftPositions[(i - 1) % leftPositions.length]}%`;
        pin.dataset.level = String(i);
        pin.onclick = () => startLevel(i);
        renderStars(document.getElementById(`stars${i}`), 3, Number(levelStars[i]) || 0);
      }
    }

    function updateLocks() {
      generateDynamicLevels();
      let completed = 0;

      for (let i = 1; i <= MAX_LEVELS; i++) {
        const levelEl = document.getElementById(`lvl${i}`);
        const lockEl = document.getElementById(`lock${i}`);
        const starsEl = document.getElementById(`stars${i}`);
        const isUnlocked = i <= unlocked;
        const stars = Number(levelStars[i]) || 0;

        if (stars > 0) completed++;
        if (levelEl) {
          levelEl.classList.toggle("locked", !isUnlocked);
          levelEl.classList.toggle("completed", stars > 0);
        }
        if (lockEl) lockEl.style.display = isUnlocked ? "none" : "block";
        if (starsEl) renderStars(starsEl, 3, stars);
      }

      const progress = Math.round((completed / MAX_LEVELS) * 100);
      const progressText = document.getElementById("progressText");
      const progressBar = document.getElementById("progressBarFill");
      if (progressText) progressText.innerText = `${progress}%`;
      if (progressBar) progressBar.style.width = `${progress}%`;
      updateHomeProgress();
    }

    function updateHomeProgress() {
      const unlockedEl = document.getElementById("homeUnlockedText");
      const coinsEl = document.getElementById("homeCoinsText");
      const accuracyEl = document.getElementById("homeAccuracyText");
      if (unlockedEl) unlockedEl.innerText = `${unlocked}/${MAX_LEVELS}`;
      if (coinsEl) coinsEl.innerText = String(coins);
      if (accuracyEl) {
        const accuracy = stats.answered ? Math.round(stats.correct * 100 / stats.answered) : 0;
        accuracyEl.innerText = `${accuracy}%`;
      }
    }

    function updateLivesUI() {
      const livesEl = document.getElementById("lives-container");
      if (livesEl) livesEl.innerText = `${"❤️".repeat(Math.max(0, lives))}${"🖤".repeat(Math.max(0, 3 - lives))}`;
    }

    async function startSurvival() {
      await questionBankReady;
      if (allQuestions.length === 0) {
        alert(lang === "en" ? "Questions could not be loaded. Please reload the game." : "No se pudieron cargar las preguntas. Recarga el juego.");
        return;
      }

      clearTimeout(answerTransitionTimer);
      isSurvival = true;
      isCategoryMode = false;
      level = 1;
      index = 0;
      score = 0;
      combo = 0;
      survivalScore = 0;
      lives = 3 + survivalBonusLives;
      survivalBonusLives = 0;
      localStorage.setItem("survivalBonusLives", "0");
      questions = shuffle([...allQuestions]);
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "block";
      document.getElementById("lifelines").style.display = "none";
      document.getElementById("quizCoins").innerText = coins;
      updateLivesUI();
      show("quiz");
      nextQ();
    }

    async function startCategory(category) {
      await questionBankReady;
      if (category !== "trueFalse" && allQuestions.length === 0) {
        alert(lang === "en" ? "Questions could not be loaded. Please reload the game." : "No se pudieron cargar las preguntas. Recarga el juego.");
        return;
      }

      clearTimeout(answerTransitionTimer);
      const newTestamentBooks = /^(mateo|marcos|lucas|juan|hechos|romanos|corintios|gálatas|efesios|filipenses|colosenses|tesalonicenses|timoteo|tito|filemón|hebreos|santiago|pedro|judas|apocalipsis)\b/i;
      const candidates = category === "trueFalse"
        ? [...trueFalseBank]
        : allQuestions.filter(question => {
          const book = (question.topic || question.ref || "").split(" - ")[0].trim();
          if (category === "newTestament") return newTestamentBooks.test(book);
          if (category === "oldTestament") return !newTestamentBooks.test(book) && !/intertestamentaria|cronología/i.test(book);
          return /quién|quien|who|pitaq/i.test(question.q_es);
        });
      const pool = candidates.length ? candidates : allQuestions;
      if (!pool.length) return;

      isSurvival = false;
      isCategoryMode = true;
      currentCategory = category;
      level = 1;
      index = 0;
      score = 0;
      combo = 0;
      questions = shuffle([...pool]).slice(0, Math.min(10, pool.length));
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "none";
      document.getElementById("lifelines").style.display = "flex";
      document.getElementById("quizCoins").innerText = coins;
      show("quiz");
      nextQ();
    }

    function startTimer() {
      clearInterval(timer);
      baseTime = getDifficultyConfig().baseTime;
      time = baseTime;
      const timerEl = document.getElementById("timer");
      const clockNumber = document.getElementById("clockNumber");
      const updateTimer = () => {
        if (clockNumber) clockNumber.innerText = String(Math.max(0, time));
        if (timerEl) {
          timerEl.style.width = `${Math.max(0, time / baseTime * 100)}%`;
          timerEl.classList.toggle("danger", time <= Math.max(2, Math.ceil(baseTime * 0.25)));
        }
      };
      updateTimer();
      timer = setInterval(() => {
        time--;
        updateTimer();
        if (time > 0) return;
        clearInterval(timer);
        stats.answered++;
        combo = 0;
        document.getElementById("comboBadge").style.display = "none";
        if (isSurvival) {
          lives--;
          updateLivesUI();
          if (lives <= 0) {
            finishSurvival();
            return;
          }
        }
        index++;
        nextQ();
      }, 1000);
    }

    function nextQ() {
      clearInterval(timer);
      if (index >= questions.length) {
        if (isSurvival) {
          questions = shuffle([...allQuestions]);
          index = 0;
        } else {
          finish();
          return;
        }
      }

      const question = questions[index];
      const label = document.getElementById("quiz-label");
      if (label) {
        const mode = isSurvival
          ? (lang === "en" ? "🔥 Survival" : lang === "qu" ? "🔥 Kawsay" : "🔥 Supervivencia")
          : isCategoryMode
            ? (lang === "en" ? "📚 Category" : lang === "qu" ? "📚 Categoría" : "📚 Categoría")
            : `${lang === "en" ? "⭐ Level" : "⭐ Nivel"} ${level}`;
        label.innerText = `${mode} · ${index + 1}/${questions.length}${isSurvival ? ` · ${survivalScore}` : ""}`;
      }

      document.getElementById("q").innerText = getLocalizedQuestionText(question);
      const verse = document.getElementById("verse");
      verse.classList.remove("show");
      verse.innerHTML = "";
      const answerContainer = document.getElementById("a");
      answerContainer.replaceChildren();

      const answers = getLocalizedAnswers(question);
      displayedAnswerOptionIndexes = shuffle(answers.map((_, optionIndex) => optionIndex));
      const correctIndex = displayedAnswerOptionIndexes.indexOf(question.c);
      displayedAnswerOptionIndexes.forEach((optionIndex, buttonIndex) => {
        const button = document.createElement("button");
        button.className = "answer";
        button.innerText = answers[optionIndex];
        button.dataset.correct = optionIndex === question.c ? "true" : "false";
        button.onclick = () => answer(buttonIndex, correctIndex);
        answerContainer.appendChild(button);
      });
      if (!isSurvival) {
        ["fiftyBtn", "timeBtn", "hintBtn", "skipBtn"].forEach(id => {
          const button = document.getElementById(id);
          if (button) button.disabled = false;
        });
      }
      startTimer();
    }

    function answer(clickedIndex, correctIndex) {
      clearInterval(timer);
      document.querySelectorAll("#a .answer").forEach((button, buttonIndex) => {
        button.onclick = null;
        if (button.dataset.correct === "true") button.classList.add("correct");
        if (buttonIndex === clickedIndex && clickedIndex !== correctIndex) button.classList.add("wrong");
      });

      const question = questions[index];
      const correct = clickedIndex === correctIndex;
      stats.answered++;
      if (correct) {
        score++;
        stats.correct++;
        survivalScore++;
        combo++;
        stats.maxCombo = Math.max(stats.maxCombo, combo);
        const reward = Math.max(1, Math.round((2 + Math.floor(combo / 2)) * getDifficultyConfig().coinMult));
        coins += reward;
        localStorage.setItem("coins", String(coins));
        document.getElementById("quizCoins").innerText = String(coins);
        if (combo >= 3) {
          const badge = document.getElementById("comboBadge");
          badge.innerText = `🔥 Racha x${combo}`;
          badge.style.display = "block";
        }
      } else {
        combo = 0;
        document.getElementById("comboBadge").style.display = "none";
        if (isSurvival) {
          lives--;
          updateLivesUI();
          if (lives <= 0) {
            finishSurvival();
            return;
          }
        }
      }

      const verse = document.getElementById("verse");
      verse.innerHTML = `<strong>📖 ${question.ref || ""}</strong> ${getLocalizedExplanation(question)}`;
      verse.classList.add("show");
      savePremiumData();
      checkAchievements();
      updateLocks();
      clearTimeout(answerTransitionTimer);
      answerTransitionTimer = setTimeout(() => {
        answerTransitionTimer = null;
        index++;
        nextQ();
      }, 900);
    }

    function useFiftyFifty() {
      const cost = getDifficultyConfig().costs.fifty;
      const button = document.getElementById("fiftyBtn");
      if (coins < cost || !questions[index]) return;
      coins -= cost;
      localStorage.setItem("coins", String(coins));
      document.getElementById("quizCoins").innerText = String(coins);
      const incorrect = [...document.querySelectorAll("#a .answer")]
        .filter(option => option.dataset.correct !== "true");
      shuffle(incorrect).slice(0, Math.max(0, incorrect.length - 1)).forEach(option => {
        option.disabled = true;
        option.style.visibility = "hidden";
      });
      if (button) button.disabled = true;
    }

    function useExtraTime() {
      const cost = getDifficultyConfig().costs.time;
      if (coins < cost) return;
      coins -= cost;
      localStorage.setItem("coins", String(coins));
      document.getElementById("quizCoins").innerText = String(coins);
      time += 10;
      baseTime += 10;
      const clockNumber = document.getElementById("clockNumber");
      if (clockNumber) clockNumber.innerText = String(time);
    }

    function useHint() {
      const cost = getDifficultyConfig().costs.hint;
      const question = questions[index];
      if (coins < cost || !question) return;
      coins -= cost;
      localStorage.setItem("coins", String(coins));
      document.getElementById("quizCoins").innerText = String(coins);
      const verse = document.getElementById("verse");
      verse.innerHTML = `<strong>📖 ${question.ref || ""}</strong> ${getLocalizedExplanation(question)}`;
      verse.classList.add("show");
      document.getElementById("hintBtn").disabled = true;
    }

    function useSkip() {
      const cost = getDifficultyConfig().costs.skip;
      if (coins < cost || !questions[index]) return;
      coins -= cost;
      localStorage.setItem("coins", String(coins));
      document.getElementById("quizCoins").innerText = String(coins);
      clearInterval(timer);
      index++;
      nextQ();
    }

    function finishCategory() {
      finish();
    }

    function finish() {
      clearInterval(timer);
      if (isCategoryMode) {
        document.getElementById("congratsTitle").innerText = lang === "en" ? "Category complete!" : "¡Categoría completada!";
        document.getElementById("congrats-score-num").innerText = String(score);
        document.querySelector("#congrats .score-den").innerText = `/${questions.length}`;
        renderStars(document.getElementById("congratsStars"), 3, getEarnedStars(score));
        document.getElementById("nextBtn").style.display = "none";
        show("congrats");
        return;
      }
      if (isSurvival) return;

      const earnedStars = getEarnedStars(score);
      document.getElementById("congrats-score-num").innerText = String(score);
      document.querySelector("#congrats .score-den").innerText = `/${questions.length}`;
      renderStars(document.getElementById("congratsStars"), 3, earnedStars);
      if (score >= getPassingScore()) {
        if (!levelStars[level] || earnedStars > levelStars[level]) {
          levelStars[level] = earnedStars;
          localStorage.setItem("levelStars", JSON.stringify(levelStars));
        }
        const previousUnlocked = unlocked;
        unlocked = Math.max(unlocked, Math.min(level + 1, MAX_LEVELS));
        localStorage.setItem("unlocked", String(unlocked));
        if (unlocked > previousUnlocked) sessionStorage.setItem("newlyUnlocked", String(unlocked));
        document.getElementById("congratsTitle").innerText = lang === "en" ? "Congratulations! 🎉" : "¡Felicidades! 🎉";
        const nextButton = document.getElementById("nextBtn");
        nextButton.style.display = level < MAX_LEVELS ? "inline-flex" : "none";
        nextButton.onclick = nextLevel;
        show("congrats");
        startContinuousConfetti();
        updateLocks();
      } else {
        document.getElementById("tryIcon").innerText = "💪";
        document.getElementById("tryTitle").innerText = lang === "en" ? "Try again!" : "¡Inténtalo de nuevo!";
        document.getElementById("tryMsg").innerText = lang === "en"
          ? `You need ${getPassingScore()} correct answers to advance.`
          : `Necesitas ${getPassingScore()} respuestas correctas para avanzar.`;
        document.getElementById("try-score-num").innerText = String(score);
        document.getElementById("try-score-den").innerText = `/${questions.length}`;
        document.getElementById("retryBtn").style.display = "inline-flex";
        show("tryagain");
      }
    }

    function finishSurvival() {
      clearInterval(timer);
      const isRecord = survivalScore > survivalHighScore;
      if (isRecord) {
        survivalHighScore = survivalScore;
        localStorage.setItem("survivalHighScore", String(survivalHighScore));
      }
      document.getElementById("tryIcon").innerText = "🔥";
      document.getElementById("tryTitle").innerText = lang === "en" ? "Game over!" : "¡Fin del juego!";
      document.getElementById("tryMsg").innerText = `${isRecord ? "🌟 ¡NUEVO RÉCORD! 🌟 " : ""}${survivalScore} ${lang === "en" ? "points" : "puntos"}`;
      document.getElementById("try-score-num").innerText = String(survivalScore);
      document.getElementById("try-score-den").innerText = " pts";
      document.getElementById("retryBtn").style.display = "none";
      show("tryagain");
    }

    function nextLevel() {
      stopContinuousConfetti();
      if (level < MAX_LEVELS && level + 1 <= unlocked) startLevel(level + 1);
      else show("map");
    }

    function retryLevel() {
      if (isSurvival) startSurvival();
      else if (isCategoryMode) startCategory(currentCategory);
      else startLevel(level);
    }

    function exitQuiz() {
      clearInterval(timer);
      clearTimeout(answerTransitionTimer);
      answerTransitionTimer = null;
      const clockAudio = document.getElementById("clockAudio");
      if (clockAudio) {
        clockAudio.pause();
        clockAudio.currentTime = 0;
      }
      show("map");
    }

    function resetProgress() {
      const confirmText = lang === "en" ? "Reset all progress?" : "¿Reiniciar todo el progreso?";
      if (!confirm(confirmText)) return;
      ["unlocked", "coins", "levelStars", "survivalHighScore", "stats", "achievements", "inventory"].forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }

    function spawnBurst(cx, cy) {
      const container = document.getElementById('confetti');
      const PAPERS = lowPerfMode ? 28 : 55;   // serpentinas rectangulares
      const DOTS = lowPerfMode ? 16 : 35;   // puntos redondos

      /* destello central */
      const flash = document.createElement('div');
      flash.style.cssText = `
    position:absolute;
    left:${cx}px; top:${cy}px;
    width:18px; height:18px;
    border-radius:50%;
    background:radial-gradient(circle, #fff 0%, rgba(255,255,200,0) 70%);
    transform:translate(-50%,-50%);
    animation: flash-pop 0.28s ease-out forwards;
    pointer-events:none;
  `;
      container.appendChild(flash);
      setTimeout(() => flash.remove(), 300);

      /* papelitos rectangulares */
      for (let i = 0; i < PAPERS; i++) {
        const piece = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const angle = (Math.random() * 360) * Math.PI / 180;
        const speed = 80 + Math.random() * 260;       // px
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - (Math.random() * 80); // arco hacia arriba
        const r0 = Math.random() * 360;
        const r1 = r0 + (Math.random() * 520 - 260);
        const flip = Math.random() > 0.5 ? 1 : -1;
        const w = 5 + Math.random() * 8;   // 5–13 px
        const h = 3 + Math.random() * 5;   // 3–8 px
        const dur = 0.45 + Math.random() * 0.35; // 0.45–0.80 s  ← RÁPIDO

        piece.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${w}px; height:${h}px;
      background:${color};
      border-radius:2px;
      transform-origin:center center;
      --vx:${vx}px; --vy:${vy}px;
      --r0:${r0}deg; --r1:${r1}deg;
      --flip:${flip};
      animation: paper-fly ${dur}s cubic-bezier(0.15,0.85,0.35,1) forwards;
      pointer-events:none;
    `;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), dur * 1000 + 50);
      }

      /* puntos redondos */
      for (let i = 0; i < DOTS; i++) {
        const dot = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const angle = (Math.random() * 360) * Math.PI / 180;
        const speed = 60 + Math.random() * 220;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - Math.random() * 70;
        const size = 4 + Math.random() * 7;
        const dur = 0.40 + Math.random() * 0.30;

        dot.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      --vx:${vx}px; --vy:${vy}px;
      animation: dot-fly ${dur}s cubic-bezier(0.1,0.9,0.3,1) forwards;
      pointer-events:none;
    `;
        container.appendChild(dot);
        setTimeout(() => dot.remove(), dur * 1000 + 50);
      }
    }

    function showConfetti(startX = 50, startY = 50) {
      /* Convertir % a px relativos a ventana */
      const cx = (startX / 100) * window.innerWidth;
      const cy = (startY / 100) * window.innerHeight;
      spawnBurst(cx, cy);
    }

    let activeCuetes = [];
    function playCuete() {
      let original = document.getElementById("cueteAudio");
      if (original) {
        let a = original.cloneNode();
        a.volume = parseFloat(document.getElementById("volume").value) || 0.5;
        
        activeCuetes.push(a);
        a.addEventListener("ended", () => {
          let idx = activeCuetes.indexOf(a);
          if (idx !== -1) activeCuetes.splice(idx, 1);
        });

        a.play().catch(e => {});
      }
    }

    function stopAllCuetes() {
      activeCuetes.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      activeCuetes = [];
    }

    let isConfettiActive = false;
    function showMultipleConfetti() {
      /* Serie de explosiones como fuegos artificiales – muy rápidas */
      const positions = [
        { x: 50, y: 35 },
        { x: 20, y: 25 }, { x: 80, y: 25 },
        { x: 30, y: 55 }, { x: 70, y: 55 },
        { x: 50, y: 70 },
        { x: 15, y: 45 }, { x: 85, y: 45 },
      ];
      positions.forEach((pos, i) => {
        setTimeout(() => {
          if (!isConfettiActive) return;
          showConfetti(pos.x, pos.y);
          playCuete();
        }, i * 160); // ← disparos cada 160 ms
      });
    }

    let confettiInterval = null;
    function startContinuousConfetti() {
      if (typeof stopContinuousConfetti === "function") stopContinuousConfetti();
      isConfettiActive = true;
      showMultipleConfetti(); // First burst pattern
      confettiInterval = setInterval(() => {
        if (!isConfettiActive) return;
        const rx = 10 + Math.random() * 80; // 10% to 90%
        const ry = 10 + Math.random() * 60; // 10% to 70%
        showConfetti(rx, ry);
        playCuete();
      }, 400); // one burst every 400ms
    }

    function stopContinuousConfetti() {
      isConfettiActive = false;
      if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
      }
      if (typeof stopAllCuetes === 'function') stopAllCuetes();
    }

    /* ===== TEMA (modo oscuro desactivado) ===== */
    let darkMode = false;

    function applyTheme() {
      // Forzar siempre modo claro
      document.documentElement.classList.remove('dark');
      darkMode = false;
    }

    function toggleTheme() {
      applyTheme();
    }

    async function loadDailyText() {
      const bodyEl = document.getElementById("dailyTextBody");
      const refEl = document.getElementById("dailyTextRef");
      if (bodyEl && refEl) {
        try {
          const verse = await window.getDailyTextForDate();
          bodyEl.innerText = '"' + verse.text + '"';
          refEl.innerText = "- " + verse.ref;
        } catch (error) {
          console.error('No se pudo mostrar el texto bíblico del día:', error);
        }
      }
    }

    /* ===== PREMIUM FEATURES LOGIC ===== */
    const storeItems = [
      { id: 'classic', name: 'Tema Clásico ✨', price: 0, desc: 'El estilo original (gratis).' },
      { id: 'sunset', name: 'Tema Atardecer 🌅', price: 120, desc: 'Cálido y alegre, como un cuento.' },
      { id: 'mint', name: 'Tema Menta 🍃', price: 160, desc: 'Fresco, suave y relajante.' },
      { id: 'forest', name: 'Tema Bosque 🌲', price: 200, desc: 'Verdor y paz.' },
      { id: 'candy', name: 'Tema Caramelos 🍭', price: 260, desc: 'Más colores y brillo divertido.' },
      { id: 'ocean', name: 'Tema Océano 🌊', price: 320, desc: 'Aguas profundas.' },
      { id: 'space', name: 'Tema Espacio 🚀', price: 520, desc: 'Estrellas, brillo y contraste gamer.' },
      { id: 'royal', name: 'Tema Real 👑', price: 720, desc: 'Dorado premium y look elegante.' },
      { id: 'neon', name: 'Tema Neón 💎', price: 900, desc: 'Luces intensas y energía arcade.' },
      { id: 'angel', name: 'Tema Cielo ☁️', price: 1200, desc: 'Ultra premium: cielo, brillo y magia.' }
    ];

    const allAchievements = [
      { id: 'a1', icon: '🧠', title: 'Erudito Básico', desc: 'Responde 20 correctas.', req: () => stats.correct >= 20 },
      { id: 'a2', icon: '🔥', title: 'Racha Imparable', desc: 'Alcanza una racha de x5.', req: () => stats.maxCombo >= 5 },
      { id: 'a3', icon: '🔥', title: 'Superviviente Nato', desc: 'Alcanza 15 pts en Supervivencia.', req: () => survivalHighScore >= 15 },
      { id: 'a4', icon: '🛍️', title: 'Decorador', desc: 'Compra un tema en la Tienda.', req: () => Object.values(inventory || {}).some(Boolean) }
    ];

    function savePremiumData() {
      localStorage.setItem('stats', JSON.stringify(stats));
      localStorage.setItem('achievements', JSON.stringify(achievements));
      localStorage.setItem('inventory', JSON.stringify(inventory));
    }

    function checkAchievements() {
      let newlyUnlocked = false;
      allAchievements.forEach(a => {
        if (!achievements[a.id] && a.req()) {
          achievements[a.id] = true;
          newlyUnlocked = true;
        }
      });
      if(newlyUnlocked) savePremiumData();
    }

    function renderShop() {
      document.getElementById("shopCoins").innerText = coins;
      let html = '';
      storeItems.forEach(item => {
        let owned = item.id === 'classic' ? true : !!inventory[item.id];
        let cantAfford = coins < item.price;
        let btnHtml = owned 
          ? `<button class="btn btn-ghost" onclick="equipTheme('${item.id}')">✨ Usar</button>`
          : `<button class="btn btn-gold" ${cantAfford ? 'disabled style="opacity:0.5"' : ''} onclick="buyItem('${item.id}', ${item.price})">💰 ${item.price}</button>`;
          
        html += `
          <div class="shop-item">
            <div class="shop-details">
              <h4>${item.name}</h4>
              <p>${item.desc}</p>
            </div>
            ${btnHtml}
          </div>
        `;
      });
      document.getElementById("shopContainer").innerHTML = html;
    }

    function buyItem(id, price) {
      if (id === 'classic') return;
      if (coins >= price) {
        let snd = document.getElementById("correctAudio");
        snd.currentTime = 0; snd.play().catch(()=>{});
        coins -= price;
        localStorage.setItem('coins', coins);
        inventory[id] = true;
        savePremiumData();
        checkAchievements();
        renderShop();
      }
    }

    function equipTheme(id) {
      document.documentElement.className = ''; 
      if(darkMode) document.documentElement.classList.add('dark');
      if(id === 'forest') document.documentElement.classList.add('theme-forest');
      if(id === 'ocean') document.documentElement.classList.add('theme-ocean');
      if(id === 'sunset') document.documentElement.classList.add('theme-sunset');
      if(id === 'mint') document.documentElement.classList.add('theme-mint');
      if(id === 'candy') document.documentElement.classList.add('theme-candy');
      if(id === 'space') document.documentElement.classList.add('theme-space');
      if(id === 'royal') document.documentElement.classList.add('theme-royal');
      if(id === 'neon') document.documentElement.classList.add('theme-neon');
      if(id === 'angel') document.documentElement.classList.add('theme-angel');
    }

    function renderAchievements() {
      let html = '';
      allAchievements.forEach(a => {
        let unlocked = achievements[a.id];
        html += `
          <div class="achievement-item ${unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="shop-details">
              <h4>${a.title}</h4>
              <p>${a.desc}</p>
            </div>
          </div>
        `;
      });
      document.getElementById("achievementsContainer").innerHTML = html;
    }

    function renderStats() {
      let acc = stats.answered > 0 ? Math.floor((stats.correct / stats.answered) * 100) : 0;
      document.getElementById("statsContainer").innerHTML = `
        <div class="stat-card">
          <div class="stat-val">${stats.answered}</div>
          <div class="stat-title">Respondidas</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.correct}</div>
          <div class="stat-title">Correctas</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${acc}%</div>
          <div class="stat-title">Precisión</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.maxCombo}</div>
          <div class="stat-title">Racha Máx</div>
        </div>
      `;
    }

    function checkDailyReward() {
      const today = new Date().toISOString().split('T')[0];
      if (lastDailyClaim !== today) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDailyClaim === yesterdayStr) dailyStreak++;
        else dailyStreak = 1;

        let reward = 10 + (Math.min(dailyStreak, 7) * 2);
        document.getElementById("dailyRewardAmount").innerText = reward;
        let text = "🔥 Racha: " + dailyStreak + (dailyStreak > 1 ? " días" : " día");
        if (lang === "en") text = "🔥 Streak: " + dailyStreak + (dailyStreak > 1 ? " days" : " day");
        if (lang === "qu") text = "🔥 Racha: " + dailyStreak + (dailyStreak > 1 ? " p'unchaykuna" : " p'unchay");
        document.getElementById("dailyStreakText").innerText = text;
        document.getElementById("dailyModal").style.display = "flex";
        
        window.pendingDailyReward = reward;
      }
    }

    function claimDailyReward() {
      const today = new Date().toISOString().split('T')[0];
      lastDailyClaim = today;
      localStorage.setItem('lastDailyClaim', lastDailyClaim);
      localStorage.setItem('dailyStreak', dailyStreak);
      
      coins += window.pendingDailyReward || 10;
      localStorage.setItem('coins', coins);
      
      document.getElementById("dailyModal").style.display = "none";
      updateLocks(); 
      let correctSnd = document.getElementById("correctAudio");
      correctSnd.currentTime = 0;
      correctSnd.play().catch(e => {});
      showConfetti();
    }

    function showDailyReward() {
      const modal = document.getElementById("dailyModal");
      if (modal) {
        // Calculate current reward based on streak
        let reward = 10 + (Math.min(dailyStreak, 7) * 2);
        document.getElementById("dailyRewardAmount").innerText = reward;
        document.getElementById("dailyStreakText").innerText = "🔥 Racha: " + dailyStreak + (dailyStreak>1?" días":" día");
        window.pendingDailyReward = reward;
        modal.style.display = "flex";
      }
    }

    detectPerformanceMode();
    applyTheme();
    updateHomeTexts();
    updateLifelineLabels();
    const savedVolume = parseFloat(localStorage.getItem('volume'));
    const volumeInput = document.getElementById("volume");
    if (volumeInput && !Number.isNaN(savedVolume)) {
      volumeInput.value = savedVolume;
    }
    updateVolume(volumeInput ? volumeInput.value : 0.5);
    clearLevelVisualTheme();
    show("map");
    updateLocks();
    loadDailyText();
    preloadCoreAssets().then(() => {
      initOnboarding();
      showTutorial();
    });
    updateGiftUI();
    setInterval(updateGiftUI, 1000);
    // Función para reproducir sonido pop al hacer clic en botones de navegación
    function playPopSound() {
      console.log('playPopSound llamado, soundMuted:', soundMuted);
      if (soundMuted) {
        console.log('Sonido muteado, no se reproduce');
        return;
      }
      let popAudio = document.getElementById("popAudio");
      console.log('popAudio existe:', !!popAudio);
      if (popAudio) {
        popAudio.currentTime = 0;
        let volume = parseFloat(document.getElementById("volume")?.value) || 0.5;
        popAudio.volume = volume;
        console.log('Reproduciendo pop.mp3 con volumen:', volume);
        popAudio.play().catch(e => {
          console.error('Error al reproducir pop.mp3:', e);
        });
      } else {
        console.error('No se encontró el elemento popAudio');
      }
    }

    // Agregar sonido pop a todos los botones de navegación (excluyendo botones de respuestas y sección de niveles)
    document.addEventListener("click", function(e) {
      // Verificar si el clic fue en un botón
      let btn = e.target.closest("button");
      if (!btn) return;

      console.log('Click en botón detectado:', btn.textContent, 'clases:', btn.className);

      // Excluir botones de respuestas (tienen clase .opt)
      if (btn.classList.contains("opt")) {
        console.log('Botón excluido: es opción de respuesta');
        return;
      }

      // Excluir botones que ya tienen su propio sonido (correct/wrong)
      if (btn.id === "fiftyBtn" || btn.id === "timeBtn" || btn.id === "hintBtn" || btn.id === "skipBtn") {
        console.log('Botón excluido: es comodín');
        return;
      }

      // Excluir botones en la sección de niveles (mapa)
      if (btn.closest("#map")) {
        console.log('Botón excluido: está en sección de niveles');
        return;
      }

      console.log('Reproduciendo sonido pop...');
      // Reproducir sonido pop
      playPopSound();
    });

    // Initialize cached elements
    initGiftElements();

    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
      if (window.Capacitor?.isNativePlatform?.()) {
        navigator.serviceWorker.getRegistrations()
          .then(registrations => Promise.all(
            registrations.map(registration => registration.unregister())
          ))
          .catch(error => {
            console.error('Error al desactivar el Service Worker nativo:', error);
          });
      } else {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(registration => {
              console.log('Service Worker registrado con éxito:', registration.scope);
            })
            .catch(error => {
              console.log('Error al registrar Service Worker:', error);
            });
        });
      }
    }

    // Request notification permission for gift reminders
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido');
          }
        });
      }
    }
