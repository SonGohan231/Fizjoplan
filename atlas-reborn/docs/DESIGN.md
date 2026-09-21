# Ustalenia i przełożenie na grę

Odtworzone ustalenia użytkownika: 50% roguelike/dungeon crawler, 25% JRPG, 25% rozbudowane RPG/MMO; pełny świat gry, realne korzyści z umiejętności, nagrody i sekrety, wiedza wpływająca na walkę, szerokie tematy nauki, dźwięk i sterowanie Android.

Poprzednie źródła przeanalizowane: FizjoRPG 3.1 oraz 3.2.2. Poprzedni silnik nie został skopiowany. Nowy renderer korzysta z Phaser; reguły i zapis są niezależne od renderowania.

Pętla: wybór krainy -> komnata -> eksploracja i skrytki -> walka -> wybór drogi -> Strażnik -> trwałe nagrody -> Sanktuarium.

Trwałe: monety, doświadczenie, statystyki wiedzy, odblokowania, kolekcja znalezionych reliktów, ulepszenia. Wyprawa: zdrowie, eliksiry, aktywne relikty, komnaty, walka. Relikty wybiera się spośród trzech; archiwalna kolekcja nie daje ich automatycznie w kolejnej wyprawie.

Nie ma XP za wielokrotne odsłanianie odpowiedzi. Nagrody za walkę i zakończenie są jednorazowe w danej wyprawie. Pomyłki są przechowywane według identyfikatora pojęcia. Powtórki trafnych odpowiedzi: 1, 3, 7, 14 i 30 dni; po błędzie termin wraca do minuty. To prosty harmonogram, nie deklaracja walidacji skuteczności uczenia. Sekwencje nie zwiększają opanowania przypadkowo przypisanego pojęcia.

Losowość: deterministyczne generowanie z ziarna; geometria bocznych przejść, dekoracje i wybór reliktów zmieniają się między wyprawami. Obiekty są umieszczane w osiągalnych miejscach. Każda kraina ma osobny szablon geometrii, temat, kolory, bossa i sekwencję akcji.

Wydanie używa osobnego identyfikatora aplikacji, by nie nadpisać starszego FizjoRPG. Podpisywany jest pełny nowy APK; nie podmieniamy zasobów w starym APK.
