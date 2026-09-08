# Nami™ Art Productions

Jednoekranowa strona-wizytówka. Czysty HTML/CSS/JS, bez build stepu i bez zależności —
wystarczy otworzyć pliki w edytorze i odświeżyć przeglądarkę.

## Struktura

```
index.html          struktura strony
style.css           mobile first: baza = mobile, @768 tablet, @980 stopka, @1200 desktop
script.js           slider, efekty tekstu, dźwięk, wibracje
Images/Slider/      mastery PNG (2240 x 1280)
Images/Slider/web/  WebP używane przez stronę: --xs 720, --sm 1120, --md 1600 px
                    (plik bez przyrostka to zapas 2240 px, nieużywany)
Typefaces/          Univers Next Pro Medium + Heavy Condensed
```

## Podgląd lokalny

Fonty ładowane z `file://` bywają blokowane, więc uruchom przez serwer:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

## Dodawanie zdjęć do slidera

1. Wrzuć master PNG do `Images/Slider/`.
2. Wygeneruj trzy wersje WebP do `Images/Slider/web/`:
   `--xs` (720 px), `--sm` (1120 px) i `--md` (1600 px).
3. Dopisz nazwę pliku bazowego do tablicy `SLIDES` w `script.js`.

Największy wariant w `srcset` to 1600 px — celowo, bo kadr ma najwyżej
1120 px CSS, a slider zmienia zdjęcia co 4 sekundy. Na retinie różnicy
nie widać, a transfer spada o 45%.

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

**Turn on effects and sound** pod zdjęciem włącza dźwięk, rozpraszanie i uderzenia.
Efekty startują wyłączone przy każdym wejściu i wybór nie jest zapamiętywany —
po przeładowaniu przeglądarka i tak blokuje dźwięk do pierwszego gestu, więc
przywrócony stan „włączone" obiecywałby dźwięk, którego nie ma. Kliknięcie
w przycisk jest jednocześnie tym gestem. Klawisz `M` robi to samo.

Uwaga: iOS nie wspiera `navigator.vibrate`, więc wibracje działają tylko na Androidzie.
