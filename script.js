/* =========================================================
   NAMI™ — SLIDER
   ---------------------------------------------------------
   ŻEBY DODAĆ KOLEJNE ZDJĘCIE:
   masterem jest PNG w Images/Slider, ale strona używa lekkich
   WebP-ów z Images/Slider/web — dwie szerokości na plik:
     slider--image-NN.webp       (2240 px, desktop / retina)
     slider--image-NN--sm.webp   (1120 px, mobile / tablet)
   Wrzuć nową parę do Images/Slider/web i dopisz nazwę
   pełnego pliku do tablicy SLIDES poniżej.

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
  fade: 0.35
};

/* Po tylu ms bez ruchu tekst wraca do stanu początkowego.
   Zabezpiecza przed zawieszeniem: palec, który zniknął bez
   pointerup, albo kursor porzucony nad tekstem. */
const TEXT_IDLE_MS = 1400;

/* To samo dla dotyku — mocniej, bo palec zasłania sam znak,
   więc reakcja musi być widoczna dookoła niego. */
const TEXT_SCATTER_TOUCH = {
  enabled: true,
  radius: 180,
  shift: 46,
  rotate: 20,
  blur: 1.2,
  fade: 0.45
};

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
const NamiFx = {
  muted: false,
  _watchers: [],

  set(value) {
    this.muted = !!value;
    document.documentElement.classList.toggle('is-muted', this.muted);
    document.querySelectorAll('[data-mute]').forEach((b) => {
      b.setAttribute('aria-pressed', String(this.muted));
      b.textContent = this.muted ? 'Turn on effects' : 'Turn off effects';
    });
    try { localStorage.setItem('nami-muted', this.muted ? '1' : '0'); } catch (e) { /* prywatne okno */ }
    this._watchers.forEach((fn) => fn(this.muted));
  },

  toggle() { this.set(!this.muted); },
  onChange(fn) { this._watchers.push(fn); }
};

(function initMuteButton() {
  let saved = null;
  try { saved = localStorage.getItem('nami-muted'); } catch (e) { /* prywatne okno */ }
  NamiFx.set(saved === '1');

  document.querySelectorAll('[data-mute]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();          // klik w MUTE nie przewija zdjęć
      NamiFx.toggle();
    });
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') NamiFx.toggle();
  });
})();


/* =========================================================
   DŹWIĘK — wspólny silnik dla tekstu i slidera
   Nuty idą przez filtr i echo, stuk przełączania osobną,
   suchą ścieżką prosto na wyjście.

   Przeglądarki nie pozwalają grać przed pierwszą interakcją,
   więc kontekst budzimy przy pierwszym kliknięciu lub dotknięciu.
   ========================================================= */
const NamiAudio = (() => {
  let ctx = null;
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
        if (!NamiFx.muted) emit(c);
      }).catch(() => { /* zablokowane do czasu gestu */ });
      return;
    }
    emit(c);
  }

  function unlock() {
    const c = init();
    if (c && c.state === 'suspended') c.resume();
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

  return { note, tick, unlock };
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

/* --------------------------------------------------------- */

(function initSlider() {
  const slider = document.querySelector('[data-slider]');
  const stage = document.querySelector('[data-slider-stage]');
  if (!slider || !stage || SLIDES.length === 0) return;

  const prevBtn = slider.querySelector('[data-slider-prev]');
  const nextBtn = slider.querySelector('[data-slider-next]');

  const list = SLIDES.map((entry) => {
    const s = typeof entry === 'string' ? { src: entry } : entry;
    const src = SLIDES_DIR + s.src;
    const small = src.replace(/(\.\w+)$/, '--sm$1');
    return {
      src,
      srcset: `${small} 1120w, ${src} 2240w`,
      alt: s.alt || '',
      caption: s.caption === undefined ? DEFAULT_CAPTION : s.caption
    };
  });

  /* --- dwie warstwy, między którymi przenikamy ---
     Zdjęć jest sporo, więc trzymamy w DOM tylko dwa <img>
     i podmieniamy im src. Inaczej przeglądarka pobrałaby
     wszystkie pliki naraz. */
  function makeLayer() {
    const figure = document.createElement('figure');
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
    back.caption.textContent = data.caption;
    back.caption.hidden = !data.caption;

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
      preload(queued);
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
        d: 0,
        jx: Math.random() * 2 - 1,
        jy: Math.random() * 2 - 1,
        jr: Math.random() * 2 - 1,
        x: 0,
        y: 0,
        freq: 0,
        on: false
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
  let pointer = null;
  let frame = null;
  let lastNote = 0;
  let lastIndex = -1;
  let appliedX = NaN;      // punkt, dla którego policzono ostatnią klatkę
  let appliedY = NaN;
  let idleTimer = null;

  function reset(it) {
    if (!it.on) return;
    it.el.style.transform = '';
    it.el.style.opacity = '';
    it.el.style.filter = '';
    it.on = false;
  }

  function apply() {
    frame = null;

    if (!pointer || NamiFx.muted) {
      items.forEach(reset);
      lastIndex = -1;
      appliedX = appliedY = NaN;
      return;
    }
    if (!measured) measure();

    // ten sam punkt co w poprzedniej klatce — nie ma czego przeliczać
    if (pointer.x === appliedX && pointer.y === appliedY) return;
    appliedX = pointer.x;
    appliedY = pointer.y;

    const { radius, shift, rotate, blur, fade } = scatter;
    const radius2 = radius * radius;

    /* 1. dystanse i znak najbliżej kursora — czyli „klawisz”,
          w który akurat uderzamy.
          Liczymy kwadraty odległości: pierwiastek wyciągamy dopiero
          dla tych kilkudziesięciu znaków, które faktycznie ruszamy. */
    let nearest = -1;
    let nearest2 = Infinity;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = it.x - pointer.x;
      const dy = it.y - pointer.y;
      it.d2 = dx * dx + dy * dy;
      if (it.d2 < nearest2) {
        nearest2 = it.d2;
        nearest = i;
      }
    }

    const key = nearest2 < 3600 ? nearest : -1;   // 60 px

    /* 2. style */
    if (scatterOn) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];

        // klawisz zostaje ostry i na swoim miejscu — cała uwaga
        // idzie na jego uderzenie, rozprasza się tylko otoczenie
        if (i === key || it.d2 > radius2) { reset(it); continue; }

        const dist = Math.sqrt(it.d2);
        const force = (1 - dist / radius) ** 2;

        // ruch poniżej progu widoczności nie jest wart zapisu stylu
        if (force < 0.015) { reset(it); continue; }

        const dx = it.x - pointer.x;
        const dy = it.y - pointer.y;
        const angle = dist === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);

        const tx = (Math.cos(angle) * shift + it.jx * shift * 0.6) * force;
        const ty = (Math.sin(angle) * shift + it.jy * shift * 0.6) * force;

        it.el.style.transform =
          `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${(it.jr * rotate * force).toFixed(2)}deg)`;
        it.el.style.opacity = (1 - fade * force).toFixed(3);
        it.el.style.filter = force > 0.15 ? `blur(${(blur * force).toFixed(2)}px)` : '';
        it.on = true;
      }
    }

    /* 3. nowy znak pod kursorem -> uderzenie i nuta */
    if (key !== -1 && key !== lastIndex) {
      const now = performance.now();
      if (now - lastNote >= TEXT_SOUND.minGap) {
        strike(items[key]);
        if (soundOn) NamiAudio.note(items[key].freq);
        if (hapticOn) NamiHaptics.tap(6);
        lastNote = now;
      }
      lastIndex = key;
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(apply);
  }

  // wyciszenie natychmiast składa znaki z powrotem na miejsce
  NamiFx.onChange((muted) => {
    if (muted) { items.forEach(reset); lastIndex = -1; }
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
    pointer = null;
    schedule();
  }

  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(release, TEXT_IDLE_MS);
  }

  function track(e) {
    pointer = { x: e.clientX, y: e.clientY };
    armIdle();
    schedule();
  }

  host.addEventListener('pointerdown', (e) => {
    measured = false;
    track(e);
  });

  host.addEventListener('pointerenter', () => { measured = false; });
  host.addEventListener('pointermove', track);

  host.addEventListener('pointerleave', release);
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);

  addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
})();
