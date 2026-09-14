# FizjoGabinet v3

Interaktywny gabinetowy system różnicowania klinicznego + baza terapii.

## Nowe w v3

- 7 algorytmów badania: bark, lędźwie/pośladek, kolano, staw skokowy/stopa, łokieć/nadgarstek/ręka, biodro/pachwina, neurologia/równowaga,
- 32 konkurujące wzorce kliniczne,
- screening czerwonych flag przed rozpoczęciem różnicowania,
- ranking zgodności wzorców na podstawie wywiadu i testów,
- podpowiedź „następnego najlepszego testu”, który najbardziej rozdziela dwie czołowe hipotezy,
- bezpośrednie przejście z wyniku badania do odpowiedniego protokołu: tejping, DN, manual, ćwiczenia i zalecenia,
- zachowana pełna baza v2: 33 karty kliniczne i 68 opisanych testów.

## Ważna interpretacja

Wynik 0–100 oznacza zgodność z wzorcem według uproszczonego systemu wag, a nie procent prawdopodobieństwa diagnozy. Algorytm nie jest formalnym modelem Bayesowskim i nie zastępuje pełnego badania, diagnostyki lekarskiej ani obrazowej, gdy jest wskazana.

Czerwone flagi blokują automatyczne przejście do protokołu terapii. W dry needling baza pokazuje cele anatomiczne i strefy ryzyka bez uniwersalnej głębokości ani kąta wkłucia.

Wersja offline znajduje się w pakiecie `FizjoGabinet_Baza_v3.zip` przygotowanym w rozmowie projektowej.
