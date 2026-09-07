# Nami™ Art Productions

Jednoekranowa strona-wizytówka. Czysty HTML/CSS/JS, bez build stepu i bez zależności —
wystarczy otworzyć pliki w edytorze i odświeżyć przeglądarkę.

## Struktura

```
index.html          struktura strony
style.css           mobile first: baza = mobile, @768 tablet, @980 stopka, @1200 desktop
script.js           slider, efekty tekstu, dźwięk, wibracje
Images/Slider/      mastery PNG (2240 x 1280)
Images/Slider/web/  WebP używane przez stronę: pełne 2240 px i wersje --sm 1120 px
Typefaces/          Univers Next Pro Medium + Heavy Condensed
```

## Podgląd lokalny

Fonty ładowane z `file://` bywają blokowane, więc uruchom przez serwer:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

## Dodawanie zdjęć do slidera

1. Wrzuć master PNG do `Images/Slider/`.
2. Wygeneruj dwie wersje WebP do `Images/Slider/web/`:
   `slider--image-NN.webp` (2240 px) i `slider--image-NN--sm.webp` (1120 px).
3. Dopisz nazwę pełnego pliku do tablicy `SLIDES` w `script.js`.

Wpis może być samą nazwą albo obiektem, jeśli zdjęcie ma inny podpis niż domyślny:
`{ src: 'slider--image-29.webp', caption: '©Ktoś Inny' }`

## Pokrętła w `script.js`

| stała | co robi |
|---|---|
| `AUTOPLAY_MS` | co ile ms zmienia się zdjęcie (0 = tylko ręcznie) |
| `NO_REPEAT` | ile ostatnich zdjęć jest zablokowanych przy losowaniu |
| `DRAG_STEP` | ile pikseli przeciągnięcia przypada na jedno zdjęcie |
| `TEXT_SCATTER` | rozpraszanie liter pod kursorem: zasięg, odsunięcie, obrót, rozmycie |
| `TEXT_SOUND` | skala, strój, barwa i długość nut |

## Jak to działa

**Slider** — 28 zdjęć losowanych tak, żeby to samo nie wróciło w promieniu 5 pozycji.
W DOM są tylko dwie warstwy z podmienianym `src`, więc przeglądarka nie pobiera
całego folderu naraz. Wariant 1120 / 2240 px wybiera `srcset`.

**Sterowanie zdjęciami** działa po najechaniu na kadr: scroll, strzałki, klik w lewą
lub prawą połowę, oraz przeciąganie — co `DRAG_STEP` pikseli jedno zdjęcie, ze stukiem
i wibracją na każdej zapadce.

**Tekst** — każde słowo siedzi w `<span class="w">`, więc wiersz nigdy nie zostaje
z jednym wyrazem (sieroty sklejane twardą spacją). Pod myszą litery uciekają od kursora,
znak pod kursorem podskakuje i gra nutę — wysokość rośnie od lewej do prawej, w pentatonice.
Na dotyku zostaje podskok, dźwięk i wibracja, bez rozpraszania.

**Turn off effects** pod zdjęciem wyłącza dźwięk, rozpraszanie i uderzenia.
Wybór ląduje w `localStorage`. Klawisz `M` robi to samo.

Uwaga: iOS nie wspiera `navigator.vibrate`, więc wibracje działają tylko na Androidzie.
