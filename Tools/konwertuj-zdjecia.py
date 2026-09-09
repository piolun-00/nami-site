#!/usr/bin/env python3
"""
Przygotowuje warianty zdjęć dla slidera Nami.

Bierze mastery z Images/Slider (PNG lub JPG) i robi z każdego trzy
pliki WebP w Images/Slider/web — po jednym na każdy rozmiar, którego
używa strona. Pomija to, co już istnieje, więc można puszczać ile razy
chcesz; przeliczy tylko nowe zdjęcia.

    python3 Tools/konwertuj-zdjecia.py
    python3 Tools/konwertuj-zdjecia.py --nadpisz    (przelicz wszystko od nowa)

Przy pierwszym uruchomieniu sam przygotuje sobie środowisko z biblioteką
Pillow. Nic nie instaluje w systemie — wszystko ląduje w Tools/venv.
"""

import os
import subprocess
import sys

KATALOG = os.path.dirname(os.path.abspath(__file__))
PROJEKT = os.path.dirname(KATALOG)
VENV = os.path.join(KATALOG, 'venv')
VENV_PY = os.path.join(VENV, 'bin', 'python3')

ZRODLA = os.path.join(PROJEKT, 'Images', 'Slider')
CEL = os.path.join(PROJEKT, 'Images', 'Slider', 'web')

# szerokość w pikselach, przyrostek w nazwie pliku
ROZMIARY = [(720, '--xs'), (1120, '--sm'), (1600, '--md')]
JAKOSC = 82


def zapewnij_pillow():
    """Uruchamia skrypt ponownie w środowisku z Pillow, jeśli trzeba."""
    try:
        import PIL  # noqa: F401
        return
    except ImportError:
        pass

    if os.environ.get('NAMI_BOOTSTRAP'):
        sys.exit('Nie udało się przygotować Pillow. Zainstaluj ręcznie:\n'
                 f'  {VENV_PY} -m pip install pillow')

    if not os.path.isfile(VENV_PY):
        print('Pierwsze uruchomienie — przygotowuję środowisko (chwilę to potrwa)...')
        subprocess.run([sys.executable, '-m', 'venv', VENV], check=True)
        subprocess.run([VENV_PY, '-m', 'pip', 'install', '-q', '--upgrade', 'pip'], check=False)
        subprocess.run([VENV_PY, '-m', 'pip', 'install', '-q', 'pillow'], check=True)
        print('Gotowe.\n')

    os.environ['NAMI_BOOTSTRAP'] = '1'
    os.execv(VENV_PY, [VENV_PY, os.path.abspath(__file__)] + sys.argv[1:])


zapewnij_pillow()

from PIL import Image  # noqa: E402  (import po przygotowaniu środowiska)


def main():
    nadpisz = '--nadpisz' in sys.argv

    if not os.path.isdir(ZRODLA):
        sys.exit(f'Nie znajduję katalogu ze zdjęciami: {ZRODLA}')
    os.makedirs(CEL, exist_ok=True)

    mastery = sorted(
        f for f in os.listdir(ZRODLA)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    )
    if not mastery:
        sys.exit(f'Brak masterów w {ZRODLA}')

    zrobione, pominiete, nowe_wpisy = 0, 0, []

    for plik in mastery:
        baza = os.path.splitext(plik)[0]
        sciezka = os.path.join(ZRODLA, plik)
        brakuje = [
            (w, s) for w, s in ROZMIARY
            if nadpisz or not os.path.isfile(os.path.join(CEL, f'{baza}{s}.webp'))
        ]
        if not brakuje:
            pominiete += 1
            continue

        oryginal = Image.open(sciezka).convert('RGB')
        for szerokosc, przyrostek in brakuje:
            wysokosc = round(oryginal.height * szerokosc / oryginal.width)
            kopia = oryginal.resize((szerokosc, wysokosc), Image.LANCZOS)
            wyjscie = os.path.join(CEL, f'{baza}{przyrostek}.webp')
            kopia.save(wyjscie, 'WEBP', quality=JAKOSC, method=6)
            zrobione += 1
            print(f'  {os.path.basename(wyjscie):40} {os.path.getsize(wyjscie) // 1024:4} KB')

        nowe_wpisy.append(baza)

    print()
    print(f'Przeliczone zdjęcia: {len(nowe_wpisy)}  (plików: {zrobione})')
    print(f'Pominięte, bo miały już komplet: {pominiete}')

    if nowe_wpisy:
        print('\nDopisz to do tablicy SLIDES w script.js:\n')
        for baza in nowe_wpisy:
            print(f"  {{ src: '{baza}.webp', alt: 'OPIS PO ANGIELSKU' }},")
        print('\nPamiętaj o podbiciu ?v= przy script.js w index.html.')


if __name__ == '__main__':
    main()
