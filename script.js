/* =========================================================
   NAMI™ — SLIDER
   ---------------------------------------------------------
   ŻEBY DODAĆ KOLEJNE ZDJĘCIE:
   masterem jest PNG w Images/Slider, ale strona używa lekkich
   WebP-ów z Images/Slider/web — trzy szerokości na plik:
     slider--image-NN--xs.webp    ( 720 px, telefony)
     slider--image-NN--sm.webp    (1120 px, tablety i gęste ekrany)
     slider--image-NN--md.webp    (1600 px, desktop, także retina)
   Plik slider--image-NN.webp (2240 px) leży obok jako zapas,
   ale strona po niego nie sięga.
   Wrzuć nowy komplet do Images/Slider/web i dopisz nazwę
   pliku bazowego (bez przyrostka) do tablicy SLIDES poniżej.

   Wpis może być zwykłą nazwą pliku albo obiektem, jeśli
   dane zdjęcie ma mieć inny podpis niż domyślny:
     { src: 'slider--image-29.webp', caption: '©Ktoś Inny' }
   ========================================================= */

const SLIDES_DIR = 'Images/Slider/web/';
const DEFAULT_CAPTION = '©Rafał Masłow';

/* Szerokość, jaką zdjęcie realnie zajmuje — przeglądarka na tej
   podstawie wybiera wariant 1120 albo 2240 px. */
const SLIDE_SIZES =
  '(min-width: 1200px) 1120px, (min-width: 768px) calc(100vw - 48px), calc(100vw - 32px)';

const SLIDES = [
  'slider--image-01.webp',
  'slider--image-02.webp',
  'slider--image-03.webp',
  'slider--image-04.webp',
  'slider--image-05.webp',
  'slider--image-06.webp',
  'slider--image-07.webp',
  'slider--image-08.webp',
  'slider--image-09.webp',
  'slider--image-10.webp',
  'slider--image-11.webp',
  'slider--image-12.webp',
  'slider--image-13.webp',
  'slider--image-14.webp',
  'slider--image-15.webp',
  'slider--image-16.webp',
  'slider--image-17.webp',
  'slider--image-18.webp',
  'slider--image-19.webp',
  'slider--image-20.webp',
  'slider--image-21.webp',
  'slider--image-22.webp',
  'slider--image-23.webp',
  'slider--image-24.webp',
  'slider--image-25.webp',
  'slider--image-26.webp',
  'slider--image-27.webp',
  'slider--image-28.webp',
];

/* Autoplay: co ile ms zmienia się zdjęcie (0 = tylko ręcznie) */
const AUTOPLAY_MS = 4000;

/* Ile ostatnio pokazanych zdjęć jest zablokowanych przy losowaniu.
   5 = to samo zdjęcie nie może wrócić w promieniu 1–5 pozycji. */
const NO_REPEAT = 5;

/* =========================================================
   TEST: rozpraszanie tekstu pod kursorem
   enabled: false  -> efekt wyłączony (tekst zachowuje się normalnie)
   radius  -> zasięg działania kursora w px
   shift   -> maksymalne odsunięcie znaku w px
   rotate  -> maksymalny obrót znaku w stopniach
   blur    -> maksymalne rozmycie w px
   fade    -> o ile spada krycie (0.35 = do 65%)
   ========================================================= */
const TEXT_SCATTER = {
  enabled: true,
  radius: 110,
  shift: 20,
  rotate: 14,
  blur: 1.8,
  fade: 0.35,
  maxChars: 150     // pod myszą praktycznie bez limitu
};

/* Po tylu ms bez ruchu tekst wraca do stanu początkowego.
   Zabezpiecza przed zawieszeniem: palec, który zniknął bez
   pointerup, albo kursor porzucony nad tekstem. */
const TEXT_IDLE_MS = 1400;

/* To samo dla dotyku — mocniej, bo palec zasłania sam znak,
   więc reakcja musi być widoczna dookoła niego. */
const TEXT_SCATTER_TOUCH = {
  enabled: true,
  radius: 130,
  shift: 34,
  rotate: 18,
  blur: 0,          // rozmycie to osobna warstwa rastrowa na każdy znak
  fade: 0.4,        // — przy dwustu znakach telefon tego nie udźwignie
  maxChars: 45      // twardy limit: koszt klatki nie rośnie z liczbą palców
};

/* Trzy palce wystarczą na akord, a urządzenie trzeba czymś trzymać. */
const TEXT_MAX_TOUCHES = 3;

/* =========================================================
   DŹWIĘK TEKSTU — jeden znak = jedna nuta
   Wysokość nuty rośnie od lewej do prawej krawędzi akapitu,
   skwantowana do skali, więc przejechanie kursorem brzmi
   jak przeciągnięcie po strunach.

   Przeglądarki blokują audio do pierwszej interakcji — dźwięk
   odzywa się dopiero po pierwszym kliknięciu gdziekolwiek
   na stronie. Klawisz M wycisza / włącza.
   ========================================================= */
const TEXT_SOUND = {
  enabled: true,
  volume: 0.13,
  wave: 'triangle',
  scale: [0, 2, 4, 7, 9],   // pentatonika durowa — nic nie zabrzmi fałszywie
  root: 196,                // G3
  octaves: 3,
  decay: 0.6,
  minGap: 25                // minimalny odstęp między nutami w ms
};

/* =========================================================
   MUTE — wspólny przełącznik efektów
   Wyłącza dźwięk, rozpraszanie tekstu i uderzenia w znaki.
   Wybór zapamiętujemy, żeby nie trzeba go było klikać
   przy każdym wejściu.
   ========================================================= */
const STORAGE_KEY = 'nami-effects';

const NamiFx = {
  muted: true,        // domyślnie wyłączone
  _watchers: [],

  /* Etykieta mówi, co się stanie po kliknięciu. aria-pressed niesie
     stan: wciśnięty = efekty włączone. */
  syncButtons() {
    document.querySelectorAll('[data-mute]').forEach((b) => {
      b.setAttribute('aria-pressed', String(!this.muted));
      b.textContent = this.muted
        ? 'Turn on effects and sound'
        : 'Turn off effects and sound';
    });
  },

  set(value, persist) {
    this.muted = !!value;
    document.documentElement.classList.toggle('is-muted', this.muted);
    this.syncButtons();

    // Zapisujemy wyłącznie świadomy wybór. Wcześniej stan lądował
    // w pamięci przy każdym wejściu, więc zapisana wartość z poprzedniej
    // wizyty przykrywała domyślne ustawienie i efekty wstawały włączone.
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, this.muted ? 'off' : 'on'); } catch (e) { /* prywatne okno */ }
    }

    this._watchers.forEach((fn) => fn(this.muted));
  },

  toggle() { this.set(!this.muted, true); },
  onChange(fn) { this._watchers.push(fn); }
};

/* =========================================================
   DŹWIĘK — wspólny silnik dla tekstu i slidera
   Nuty idą przez filtr i echo, stuk przełączania osobną,
   suchą ścieżką prosto na wyjście.

   Przeglądarki nie pozwalają grać przed pierwszą interakcją,
   więc kontekst budzimy przy pierwszym kliknięciu lub dotknięciu.
   ========================================================= */
const NamiAudio = (() => {
  let ctx = null;
  let unlocked = false;
  const watchers = [];
  let noteBus = null;   // nuty: filtr + echo
  let tickBus = null;   // stuk: sucho, prosto na wyjście
  let noise = null;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    ctx = new AC();

    // iOS 17+: bez tego Web Audio milczy, gdy telefon ma włączony
    // sprzętowy przełącznik ciszy
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* nieobsługiwane */ }

    noteBus = ctx.createGain();
    noteBus.gain.value = TEXT_SOUND.volume;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.19;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.2;

    noteBus.connect(lp);
    lp.connect(ctx.destination);
    lp.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(ctx.destination);

    tickBus = ctx.createGain();
    tickBus.gain.value = 0.16;
    tickBus.connect(ctx.destination);

    // szum pod stuk — jeden bufor, odtwarzany od losowego miejsca
    const len = Math.floor(ctx.sampleRate * 0.25);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  /* Kontekst budzi się asynchronicznie, więc pierwszy dotyk trafiał
     w stan 'suspended' i po prostu nic nie grało. Teraz zamiast
     rezygnować, czekamy na wybudzenie i gramy chwilę później. */
  function play(emit) {
    const c = init();
    if (!c || NamiFx.muted) return;

    if (c.state !== 'running') {
      c.resume().then(() => {
        markUnlocked();
        if (!NamiFx.muted) emit(c);
      }).catch(() => { /* zablokowane do czasu gestu */ });
      return;
    }
    emit(c);
  }

  function markUnlocked() {
    if (unlocked || !ctx || ctx.state !== 'running') return;
    unlocked = true;
    watchers.forEach((fn) => fn());
  }

  function unlock() {
    const c = init();
    if (!c) return;
    if (c.state === 'suspended') c.resume().then(markUnlocked).catch(() => {});
    else markUnlocked();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    addEventListener(ev, unlock, { passive: true })
  );

  /* nuta znaku */
  function note(freq) {
    play((c) => emitNote(c, freq));
  }

  function emitNote(c, freq) {
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = TEXT_SOUND.wave;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() * 2 - 1) * 5;

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + TEXT_SOUND.decay);

    osc.connect(g);
    g.connect(noteBus);
    osc.start(t);
    osc.stop(t + TEXT_SOUND.decay + 0.05);
    osc.onended = () => g.disconnect();
  }

  /* zapadka przełączania zdjęć — suchy, pusty stuk,
     jak digital crown: krótki szum przez wąskie pasmo */
  function tick() {
    play(emitTick);
  }

  function emitTick(c) {
    const t = c.currentTime;

    const src = c.createBufferSource();
    src.buffer = noise;
    src.loop = true;

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 400;
    bp.Q.value = 7;

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.026);

    src.connect(bp);
    bp.connect(g);
    g.connect(tickBus);

    src.start(t, Math.random() * 0.2);
    src.stop(t + 0.03);
    src.onended = () => g.disconnect();
  }

  return {
    note,
    tick,
    unlock,
    get unlocked() { return unlocked; },
    onUnlock(fn) { watchers.push(fn); }
  };
})();

/* =========================================================
   WIBRACJE — krótkie stuknięcia na dotyku
   Uwaga: iOS/Safari nie wspiera navigator.vibrate, więc na
   iPhonie to po prostu nic nie zrobi. Android działa.
   ========================================================= */
const NamiHaptics = {
  ok: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  tap(ms) {
    if (!this.ok || NamiFx.muted) return;
    try { navigator.vibrate(ms || 8); } catch (e) { /* zablokowane */ }
  }
};

(function initMuteButton() {
  // Domyślnie efekty są wyłączone. Dzięki temu kliknięcie w przycisk
  // jest tym samym gestem, na który przeglądarka czeka, zanim wpuści
  // dźwięk — nie trzeba użytkownika prosić o osobne kliknięcie.
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* prywatne okno */ }
  NamiFx.set(saved !== 'on');

  document.querySelectorAll('[data-mute]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();          // klik w przycisk nie przewija zdjęć
      NamiAudio.unlock();           // ten klik jest gestem odblokowującym dźwięk
      NamiFx.toggle();
    });
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') NamiFx.toggle();
  });
})();


/* --------------------------------------------------------- */

(function initSlider() {
  const slider = document.querySelector('[data-slider]');
  const stage = document.querySelector('[data-slider-stage]');
  if (!slider || !stage || SLIDES.length === 0) return;

  const prevBtn = slider.querySelector('[data-slider-prev]');
  const nextBtn = slider.querySelector('[data-slider-next]');

  const list = SLIDES.map((entry) => {
    const s = typeof entry === 'string' ? { src: entry } : entry;
    const full = SLIDES_DIR + s.src;
    const medium = full.replace(/(\.\w+)$/, '--md$1');
    const small = full.replace(/(\.\w+)$/, '--sm$1');
    const tiny = full.replace(/(\.\w+)$/, '--xs$1');

    /* Największy wariant w srcset to 1600 px, mimo że plik 2240 px
       leży obok. Kadr ma najwyżej 1120 px CSS, więc na ekranie retina
       1600 px to i tak 1.4-1.6x gęstości — różnicy nie widać, a plik
       waży o 45% mniej. Slider zmienia zdjęcie co 4 s, więc to jest
       ta pozycja, która realnie decyduje o transferze. */
    return {
      src: medium,
      srcset: `${tiny} 720w, ${small} 1120w, ${medium} 1600w`,
      alt: s.alt || '',
      caption: s.caption === undefined ? DEFAULT_CAPTION : s.caption
    };
  });

  /* --- dwie warstwy, między którymi przenikamy ---
     Zdjęć jest sporo, więc trzymamy w DOM tylko dwa <img>
     i podmieniamy im src. Inaczej przeglądarka pobrałaby
     wszystkie pliki naraz. */
  function makeLayer() {
    const figure = document.createElement('div');
    figure.className = 'slider__slide';

    const frame = document.createElement('div');
    frame.className = 'slider__frame';

    const img = document.createElement('img');
    img.draggable = false;
    img.decoding = 'async';
    img.fetchPriority = 'high';   // pierwszy kadr to główny obrazek strony
    img.alt = '';

    const caption = document.createElement('figcaption');
    caption.className = 'nami--caption-small';

    frame.append(img, caption);
    figure.appendChild(frame);
    stage.appendChild(figure);

    return { figure, frame, img, caption };
  }

  const layers = [makeLayer(), makeLayer()];
  const caption = stage.querySelector('[data-caption]');
  let front = 0;

  const history = [];   // indeksy w kolejności wyświetlenia
  let cursor = -1;      // pozycja w history (cofanie się)
  let queued = null;    // wylosowany i wstępnie wczytany następny
  let timer = null;
  let dragging = false;
  let revealed = false;

  /* --- losowanie z blokadą powtórek ---
     Odpadają indeksy z NO_REPEAT ostatnich pokazań, więc to samo
     zdjęcie nie może wrócić bliżej niż co NO_REPEAT + 1 pozycji. */
  function pick() {
    const span = Math.min(NO_REPEAT, list.length - 1);
    const banned = new Set(history.slice(-span));
    if (queued !== null) banned.add(queued);

    const pool = [];
    for (let i = 0; i < list.length; i++) if (!banned.has(i)) pool.push(i);

    const from = pool.length ? pool : list.map((_, i) => i);
    return from[Math.floor(Math.random() * from.length)];
  }

  /* Doładowanie następnego zdjęcia „w zapasie”. Czeka na koniec
     ładowania strony — inaczej odbierałoby pasmo pierwszemu kadrowi,
     a i tak jest potrzebne dopiero za kilka sekund. */
  let warm = false;

  function prefetch(i) {
    if (warm) preload(i);
  }

  function warmUp() {
    if (warm) return;
    warm = true;
    if (queued !== null) preload(queued);
  }

  if (document.readyState === 'complete') setTimeout(warmUp, 300);
  else addEventListener('load', () => setTimeout(warmUp, 300), { once: true });

  function preload(i) {
    const img = new Image();
    // sizes przed srcset — inaczej przeglądarka wybierze inny wariant
    // niż ten, który potem trafi do <img>, i pobierze plik dwa razy
    img.sizes = SLIDE_SIZES;
    img.srcset = list[i].srcset;
    img.src = list[i].src;
    return img;
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    document.documentElement.classList.add('is-ready');
  }
  setTimeout(reveal, 1500);

  function render(i) {
    const back = layers[1 - front];
    const data = list[i];

    back.img.sizes = SLIDE_SIZES;
    back.img.srcset = data.srcset;
    back.img.src = data.src;
    back.img.alt = data.alt;

    if (caption) {
      caption.textContent = data.caption || '';
      caption.hidden = !data.caption;
    }

    const setRatio = () => {
      if (back.img.naturalWidth && back.img.naturalHeight) {
        slider.style.setProperty('--ar', back.img.naturalWidth / back.img.naturalHeight);
      }
    };
    back.img.complete ? setRatio() : back.img.addEventListener('load', setRatio, { once: true });

    layers[front].figure.classList.remove('is-active');
    back.figure.classList.add('is-active');
    front = 1 - front;

    reveal();
  }

  /* Podmieniamy dopiero gdy plik jest gotowy — inaczej
     przenikalibyśmy do pustej warstwy. */
  function show(i) {
    const img = preload(i);
    if (img.complete) {
      render(i);
      return;
    }
    img.addEventListener('load', () => render(i), { once: true });
    img.addEventListener('error', () => render(i), { once: true });
  }

  function goNext() {
    if (cursor < history.length - 1) {
      cursor += 1;
      show(history[cursor]);
    } else {
      const i = queued !== null ? queued : pick();
      queued = null;

      history.push(i);
      if (history.length > 40) history.shift();
      cursor = history.length - 1;

      show(i);

      queued = pick();      // losujemy już po dopisaniu do history
      prefetch(queued);
    }
    restartAutoplay();
  }

  function goPrev() {
    if (cursor > 0) {
      cursor -= 1;
      show(history[cursor]);
      restartAutoplay();
    } else {
      goNext();             // na początku historii nie ma dokąd cofać
    }
  }

  function restartAutoplay() {
    clearInterval(timer);
    if (dragging) return;
    if (AUTOPLAY_MS && list.length > 1) timer = setInterval(goNext, AUTOPLAY_MS);
  }

  /* --- start --- */
  goNext();

  if (list.length < 2) {
    slider.classList.add('is-single');
    return;
  }

  /* --- klik w lewą / prawą część zdjęcia --- */
  nextBtn.addEventListener('click', () => { if (dragMoved <= 8) goNext(); });
  prevBtn.addEventListener('click', () => { if (dragMoved <= 8) goPrev(); });

  /* --- sterowanie działa dopiero po najechaniu na zdjęcie --- */
  let dragMoved = 0;      // dystans ostatniego przeciągnięcia
  let hovering = false;
  stage.addEventListener('pointerenter', () => { hovering = true; });
  stage.addEventListener('pointerleave', () => { hovering = false; });

  function armed() {
    // albo kursor jest na zdjęciu, albo strzałka slidera ma focus
    // (żeby dało się przewijać zdjęcia z samej klawiatury)
    return hovering || stage.contains(document.activeElement);
  }

  /* --- klawiatura --- */
  document.addEventListener('keydown', (e) => {
    if (!armed()) return;
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  /* --- scroll nad zdjęciem przewija zdjęcia ---
     Throttle, żeby jeden gest kółka nie przeleciał przez pół galerii. */
  let lastWheel = 0;
  stage.addEventListener('wheel', (e) => {
    if (!hovering) return;
    e.preventDefault();

    const now = performance.now();
    if (now - lastWheel < 400) return;
    lastWheel = now;

    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta > 0) goNext();
    else if (delta < 0) goPrev();
  }, { passive: false });

  /* --- przeciąganie po zdjęciu ---
     Co DRAG_STEP pikseli przeskakuje jedno zdjęcie, więc im
     szybciej ciągniesz, tym gęściej lecą zmiany — jak zapadki
     w digital crown. Zawsze w poziomie: pion zostaje
     przeglądarce, żeby dało się przewijać stronę palcem. */
  const DRAG_STEP = 55;

  let dragId = null;
  let lastPos = 0;
  let travel = 0;

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-mute]')) return;

    dragging = true;
    dragId = e.pointerId;
    lastPos = e.clientX;
    travel = 0;
    dragMoved = 0;

    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* nieważne */ }
    clearInterval(timer);          // autoplay milczy, dopóki trzymasz
    NamiHaptics.tap(6);            // telefon kwituje przytrzymanie
  });

  stage.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragId) return;

    const delta = e.clientX - lastPos;
    lastPos = e.clientX;

    travel += delta;
    dragMoved += Math.abs(delta);

    while (Math.abs(travel) >= DRAG_STEP) {
      const dir = travel > 0 ? 1 : -1;
      travel -= dir * DRAG_STEP;

      // w lewo = do przodu
      if (dir < 0) goNext();
      else goPrev();

      NamiAudio.tick();
      NamiHaptics.tap(8);
    }
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== dragId)) return;
    dragging = false;
    try { stage.releasePointerCapture(dragId); } catch (err) { /* nieważne */ }
    dragId = null;
    restartAutoplay();
  }

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* --- dostępna wysokość sceny -> --stage-h ---
     Na desktopie szerokość kadru liczy się z wysokości i proporcji,
     więc scena to dokładnie zdjęcie — podpis i MUTE trzymają się
     jego krawędzi.

     Wysokość liczymy z viewportu minus nagłówek, dolny blok
     i paddingi. Mierzenie samego slidera dawałoby sprzężenie
     zwrotne: scena rosłaby od wartości, którą sama ustawia. */
  const page = document.querySelector('.nami');
  const header = document.querySelector('.nami--logo__navstar');
  const bottom = document.querySelector('.nami--bottom-wrapper');
  const main = slider.parentElement;

  function updateStageHeight() {
    if (!page || !header || !bottom || !main) return;

    const pagePad = parseFloat(getComputedStyle(page).paddingTop) +
                    parseFloat(getComputedStyle(page).paddingBottom);
    const mainPad = parseFloat(getComputedStyle(main).paddingBottom);

    const available = window.innerHeight - pagePad - header.offsetHeight -
                      bottom.offsetHeight - mainPad;

    slider.style.setProperty('--stage-h', Math.max(240, Math.round(available)) + 'px');
  }

  updateStageHeight();
  addEventListener('resize', updateStageHeight, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateStageHeight);

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(updateStageHeight);
    ro.observe(header);
    ro.observe(bottom);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else restartAutoplay();
  });
})();


/* =========================================================
   TEKST — SIEROTY, ROZPRASZANIE I DŹWIĘK
   ---------------------------------------------------------
   1. Każde słowo trafia do <span class="w"> — to podstawa
      zarówno dla łamania wierszy, jak i dla efektów.
   2. Pilnowanie sierot: żaden wiersz nie może zostać z jednym
      słowem. Taki wyraz jest sklejany z sąsiadem twardą
      spacją, więc schodzi w dół razem z nim. Działa na
      każdej szerokości ekranu.
   3. Rozpraszanie i dźwięk — tylko dla myszy.
   ========================================================= */
(function initText() {
  const host = document.querySelector('.nami--text');
  if (!host) return;

  const NBSP = '\u00A0';   // twarda spacja

  /* ---------- 1. podział na słowa ---------- */
  const words = [];
  const gapAfter = new Map();   // indeks słowa -> węzeł odstępu za nim

  (function wrap(node) {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();

        n.textContent.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (!token.trim()) {
            const space = document.createTextNode(token);
            frag.appendChild(space);
            gapAfter.set(words.length - 1, space);
            return;
          }
          const word = document.createElement('span');
          word.className = 'w';
          word.textContent = token;
          frag.appendChild(word);
          words.push(word);
        });

        node.replaceChild(frag, n);
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        wrap(n);
      }
    });
  })(host);

  if (!words.length) return;

  /* ---------- 2. sieroty ---------- */
  function lineGroups() {
    const rows = new Map();
    for (const w of words) {
      const top = Math.round(w.getBoundingClientRect().top);
      if (!rows.has(top)) rows.set(top, []);
      rows.get(top).push(w);
    }
    return [...rows.values()];
  }

  function fixWidows() {
    // najpierw rozklejamy wszystko, bo przy innej szerokości
    // stare sklejenia mogą już nie być potrzebne
    gapAfter.forEach((node) => {
      if (node.nodeValue === NBSP) node.nodeValue = ' ';
    });

    const tried = new Set();

    for (let pass = 0; pass < 6; pass++) {
      const lonely = lineGroups().find((row) => row.length === 1);
      if (!lonely) return;

      const index = words.indexOf(lonely[0]);

      // sklejamy z poprzednim słowem, a gdy to pierwsze
      // słowo w akapicie — z następnym
      let gapIndex = index > 0 ? index - 1 : index;
      if (tried.has(gapIndex)) gapIndex = index;
      if (tried.has(gapIndex) || !gapAfter.has(gapIndex)) return;

      gapAfter.get(gapIndex).nodeValue = NBSP;
      tried.add(gapIndex);
    }
  }

  fixWidows();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixWidows);

  let measured = false;      // pozycje znaków wymagają przeliczenia
  let resizeTimer = null;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fixWidows();
      measured = false;
    }, 150);
  }, { passive: true });

  /* ---------- 3. efekty (tylko mysz) ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Wszystko działa wszędzie, tylko siła rozproszenia jest inna
  // pod myszą i pod palcem.
  const scatter = fine ? TEXT_SCATTER : TEXT_SCATTER_TOUCH;
  const scatterOn = scatter && scatter.enabled && !reduce;
  const soundOn = TEXT_SOUND && TEXT_SOUND.enabled;
  const hapticOn = !fine && NamiHaptics.ok;
  if (!scatterOn && !soundOn && !hapticOn) return;

  /* --- podział słów na znaki --- */
  const items = [];

  for (const word of words) {
    const text = word.textContent;
    word.textContent = '';
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'ch';

      // wewnętrzny span nosi animację uderzenia, zewnętrzny —
      // rozpraszanie. Rozdzielone, bo inaczej transformacje
      // by się nadpisywały
      const glyph = document.createElement('span');
      glyph.className = 'ch__g';
      glyph.textContent = ch;
      span.appendChild(glyph);

      word.appendChild(span);
      items.push({
        el: span,
        glyph,
        jx: Math.random() * 2 - 1,
        jy: Math.random() * 2 - 1,
        jr: Math.random() * 2 - 1,
        x: 0,
        y: 0,
        freq: 0,
        on: false,
        d2: 0,        // kwadrat odległości od aktualnie liczonego palca
        stamp: 0,     // numer klatki, w której znak dostał wkład
        tx: 0,
        ty: 0,
        peak: 0,      // najsilniejszy wpływ spośród palców
        lastT: '',    // ostatnio zapisane wartości — nie piszemy dwa razy tego samego
        lastO: '',
        lastF: ''
      });
    }
  }

  // dopiero teraz słowa muszą być inline-block, żeby wiersz
  // nie łamał się między znakami w środku wyrazu
  host.classList.add('is-split');
  fixWidows();

  /* --- pozycje znaków i przypisane im nuty --- */
  function measure() {
    const box = host.getBoundingClientRect();
    const steps = TEXT_SOUND.scale.length * TEXT_SOUND.octaves;

    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      it.x = r.left + r.width / 2;
      it.y = r.top + r.height / 2;

      // pozycja w poziomie -> stopień skali
      const rel = Math.min(1, Math.max(0, (it.x - box.left) / box.width));
      const step = Math.min(steps - 1, Math.floor(rel * steps));
      const semitone =
        TEXT_SOUND.scale[step % TEXT_SOUND.scale.length] +
        12 * Math.floor(step / TEXT_SOUND.scale.length);
      it.freq = TEXT_SOUND.root * Math.pow(2, semitone / 12);
    }
    measured = true;
  }

  addEventListener('scroll', () => { measured = false; }, { passive: true });

  /* --- uderzenie w znak: jak w klawisz albo szarpnięta struna --- */
  function strike(it) {
    if (!it.glyph.animate) return;
    it.glyph.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-9px) scale(1.5)', offset: 0.16 },
        { transform: 'translateY(2px) scale(0.9)', offset: 0.42 },
        { transform: 'translateY(-2px) scale(1.08)', offset: 0.68 },
        { transform: 'translateY(0) scale(1)' }
      ],
      { duration: 520, easing: 'cubic-bezier(0.25, 0.9, 0.3, 1)' }
    );
  }

  /* --- pętla --- */
  /* Wiele palców naraz — każdy prowadzi własną linię melodyczną.
     Klucz to pointerId, więc mysz i pojedynczy dotyk to po prostu
     jeden wpis w tej mapie. */
  const pointers = new Map();
  let frame = null;
  let dirty = false;       // czy od ostatniej klatki coś się ruszyło
  let idleTimer = null;

  function reset(it) {
    if (!it.on) return;
    it.el.style.transform = '';
    it.el.style.opacity = '';
    it.el.style.filter = '';
    it.el.style.transitionDuration = '';
    it.lastT = it.lastO = it.lastF = '';
    it.on = false;
  }

  let stamp = 0;              // numer klatki
  const touched = [];         // znaki, które dostały wkład w tej klatce
  const onNow = new Set();    // znaki aktualnie przesunięte

  function apply() {
    frame = null;

    if (!pointers.size || NamiFx.muted) {
      onNow.forEach((i) => reset(items[i]));
      onNow.clear();
      dirty = false;
      return;
    }

    // nic się nie ruszyło od poprzedniej klatki
    if (!dirty) return;
    dirty = false;

    /* Pozycje mierzymy wyłącznie w spoczynku. getBoundingClientRect
       uwzględnia transformacje, więc pomiar w trakcie gestu zapisałby
       przesunięte pozycje jako spoczynkowe — psując i wykrywanie znaku
       pod palcem, i przypisane mu nuty. */
    if (!measured && onNow.size === 0) measure();

    const { radius, shift, rotate, blur, fade, maxChars } = scatter;
    const radius2 = radius * radius;
    const useBlur = blur > 0;
    const active = [...pointers.values()];

    stamp += 1;
    touched.length = 0;
    const keys = new Set();

    for (const p of active) {
      let nearest = -1;
      let best = Infinity;
      const near = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const dx = it.x - p.x;
        const dy = it.y - p.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < best) { best = d2; nearest = i; }
        if (scatterOn && d2 <= radius2) { it.d2 = d2; near.push(i); }
      }

      p.nearest = best < 3600 ? nearest : -1;   // 60 px
      if (p.nearest !== -1) keys.add(p.nearest);

      if (!scatterOn) continue;

      // twardy limit na wskaźnik — koszt klatki nie rośnie z liczbą palców
      if (near.length > maxChars) {
        near.sort((a, b) => items[a].d2 - items[b].d2);
        near.length = maxChars;
      }

      for (const i of near) {
        const it = items[i];
        const dist = Math.sqrt(it.d2);
        const force = (1 - dist / radius) ** 2;
        if (force < 0.015) continue;          // poniżej progu widoczności

        if (it.stamp !== stamp) {
          it.stamp = stamp;
          it.tx = 0;
          it.ty = 0;
          it.peak = 0;
          touched.push(i);
        }

        const angle = dist === 0
          ? Math.random() * Math.PI * 2
          : Math.atan2(it.y - p.y, it.x - p.x);

        it.tx += (Math.cos(angle) * shift + it.jx * shift * 0.6) * force;
        it.ty += (Math.sin(angle) * shift + it.jy * shift * 0.6) * force;
        if (force > it.peak) it.peak = force;
      }
    }

    /* zapisy stylu — tylko dla znaków z wkładem i tylko wtedy,
       gdy wartość faktycznie się zmieniła */
    if (scatterOn) {
      for (const i of touched) {
        if (keys.has(i)) continue;            // znak pod palcem zostaje na miejscu

        const it = items[i];
        const t = `translate(${it.tx.toFixed(1)}px, ${it.ty.toFixed(1)}px) rotate(${(it.jr * rotate * it.peak).toFixed(1)}deg)`;
        if (t !== it.lastT) { it.el.style.transform = t; it.lastT = t; }

        const o = (1 - fade * it.peak).toFixed(2);
        if (o !== it.lastO) { it.el.style.opacity = o; it.lastO = o; }

        if (useBlur) {
          const f = it.peak > 0.15 ? `blur(${(blur * it.peak).toFixed(1)}px)` : '';
          if (f !== it.lastF) { it.el.style.filter = f; it.lastF = f; }
        }

        if (!it.on) {
          // krótszy czas tylko na wejściu; powrót zostaje przy dłuższym
          // z arkusza, żeby składanie tekstu było wyraźnie miękkie
          it.el.style.transitionDuration = '260ms';
          it.on = true;
        }
        onNow.add(i);
      }

      // znaki, które wypadły z zasięgu albo trafiły pod palec
      for (const i of [...onNow]) {
        if (items[i].stamp === stamp && !keys.has(i)) continue;
        reset(items[i]);
        onNow.delete(i);
      }
    }

    /* uderzenia i nuty — każdy palec ma własny licznik,
       więc trzy mogą zagrać jednocześnie */
    const now = performance.now();

    for (const p of active) {
      if (p.nearest === -1 || p.nearest === p.lastIndex) continue;
      if (now - p.lastNote < TEXT_SOUND.minGap) continue;

      strike(items[p.nearest]);
      if (soundOn) NamiAudio.note(items[p.nearest].freq);
      if (hapticOn) NamiHaptics.tap(6);

      p.lastNote = now;
      p.lastIndex = p.nearest;
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(apply);
  }

  // wyciszenie natychmiast składa znaki z powrotem na miejsce
  NamiFx.onChange((muted) => {
    if (muted) release();
  });

  // samo tapnięcie ma dać to samo co przejechanie: uderzenie,
  // nutę i wibrację. Bez tego palec postawiony bez ruchu nie
  // wywoływał pointermove i znak milczał.
  /* Powrót do stanu początkowego. Wołane po bezczynności, po
     puszczeniu palca i wtedy, gdy strona traci uwagę — inaczej
     znikający wskaźnik (przełączenie apki, zgaszenie ekranu)
     zostawiałby tekst rozsunięty na stałe. */
  function release() {
    clearTimeout(idleTimer);
    idleTimer = null;
    pointers.clear();
    dirty = true;
    schedule();
  }

  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(release, TEXT_IDLE_MS);
  }

  function track(e) {
    let p = pointers.get(e.pointerId);
    if (!p) {
      if (pointers.size >= TEXT_MAX_TOUCHES) return;
      p = { lastIndex: -1, lastNote: 0, nearest: -1 };
      pointers.set(e.pointerId, p);
    }
    p.x = e.clientX;
    p.y = e.clientY;

    dirty = true;
    armIdle();
    schedule();
  }

  function drop(e) {
    pointers.delete(e.pointerId);
    dirty = true;
    if (!pointers.size) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    schedule();
  }

  host.addEventListener('pointerdown', (e) => {
    // przeliczamy pozycje tylko przy pierwszym palcu, czyli w spoczynku
    if (!pointers.size) measured = false;
    track(e);
  });

  host.addEventListener('pointerenter', () => { measured = false; });
  host.addEventListener('pointermove', track);

  host.addEventListener('pointerleave', drop);
  host.addEventListener('pointerup', drop);
  host.addEventListener('pointercancel', drop);

  addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
})();
