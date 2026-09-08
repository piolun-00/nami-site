# Kroje pisma

Pliki fontów **nie są trzymane w tym repozytorium** — licencja
Univers Next Pro (Linotype / Monotype) nie obejmuje redystrybucji plików,
a publiczne repozytorium byłoby właśnie redystrybucją.

Żeby strona wyglądała zgodnie z projektem, w tym katalogu muszą znaleźć się:

```
UniversNextPro-Medium.woff2          podzbiór Latin-1 + Latin Extended-A
UniversNextPro-HeavyCond.woff2       jw.
UniversNextPro-Medium.ttf            pełny krój, źródło do podzbioru
UniversNextPro-HeavyCond.ttf         jw.
```

Pliki dostarcza zamawiający, wraz z licencją webfont uprawniającą do
osadzenia krojów na stronie internetowej.

## Bez tych plików

Strona działa i nic się nie psuje — przeglądarka schodzi na zapasowy
zestaw z `font-family`: Helvetica Neue / Helvetica / Arial, a dla napisów
z kroju wąskiego Helvetica Neue Condensed / Arial Narrow. Proporcje
i układ zostają, zmienia się sam rysunek liter.

W konsoli pojawią się wtedy dwa nieudane pobrania z `rel=preload` —
to oczekiwane i nie wpływa na działanie strony.

## Odtworzenie podzbiorów

Podzbiory powstały z pełnych plików TTF, zakres znaków:

```
U+0020-007E, U+00A0-00FF, U+0100-017F, U+2018-201E,
U+2013-2014, U+2022, U+2026, U+20AC, U+2122, U+00A9, U+00AE
```

Narzędzie: `pyftsubset` z pakietu `fonttools`, z `--flavor=woff2`
i `--layout-features=kern,liga`.
