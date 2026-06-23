// Central place for Polish UI copy. Keeps screens clean and makes future i18n
// (e.g. adding English UI) a matter of adding another dictionary.

export const pl = {
  appName: 'FizjoPlan',
  tagline: 'Inteligentna baza ćwiczeń i propozycje rehabilitacji',

  testBanner: {
    version: 'WERSJA TESTOWA',
    educational: 'Ćwiczenia edukacyjne',
    physioReview: 'Wymaga weryfikacji fizjoterapeuty',
    notDiagnosis: 'To nie jest diagnoza medyczna',
  },

  home: {
    start: 'Opisz swój problem',
    browse: 'Przeglądaj ćwiczenia',
    admin: 'Panel administratora',
    disclaimer:
      'Aplikacja nie stawia diagnozy. Podpowiada propozycje ćwiczeń o charakterze edukacyjnym. W razie wątpliwości skonsultuj się z fizjoterapeutą lub lekarzem.',
  },

  describe: {
    title: 'Opisz dolegliwość',
    placeholder: 'np. „ból biodra przy siedzeniu”, „łokieć tenisisty”, „ból pleców po pracy biurowej”',
    examplesLabel: 'Przykłady:',
    examples: [
      'ból biodra przy siedzeniu',
      'łokieć tenisisty',
      'ból kolana po rekonstrukcji ACL',
      'ból dolnego odcinka pleców po pracy biurowej',
    ],
    analyze: 'Analizuj',
    empty: 'Wpisz krótki opis dolegliwości.',
  },

  level: {
    title: 'Wybierz poziom trudności',
    subtitle: 'Możliwy problem:',
    easy: 'Łatwy',
    medium: 'Średni',
    advanced: 'Zaawansowany',
    easyDesc: 'Delikatne ćwiczenia na początek.',
    mediumDesc: 'Większe obciążenie i zakres.',
    advancedDesc: 'Wymagające warianty dla osób sprawnych.',
    generate: 'Wygeneruj plan',
  },

  plan: {
    title: 'Propozycja ćwiczeń',
    summary: 'Podsumowanie',
    safety: 'Uwagi bezpieczeństwa',
    redFlags: 'Objawy alarmowe',
    exercises: 'Ćwiczenia',
    frequency: 'Częstotliwość',
    progression: 'Progresja',
    stop: 'Kiedy przerwać i skonsultować się',
    export: 'Eksportuj PDF',
    exporting: 'Generuję PDF…',
    thin: 'Za mało dopasowanych ćwiczeń. Spróbuj doprecyzować opis lub zmienić poziom.',
    details: 'Szczegóły',
  },

  detail: {
    description: 'Opis',
    dose: 'Dawkowanie',
    sets: 'Serie',
    reps: 'Powtórzenia',
    duration: 'Czas',
    frequency: 'Częstotliwość/tydz.',
    equipment: 'Sprzęt',
    position: 'Pozycja',
    progression: 'Progresja',
    regression: 'Regresja',
    contraindications: 'Przeciwwskazania',
    source: 'Źródło',
  },

  admin: {
    title: 'Panel administratora',
    add: 'Dodaj ćwiczenie',
    edit: 'Edytuj',
    delete: 'Usuń',
    save: 'Zapisz',
    seed: 'Załaduj dane przykładowe',
    notConfigured:
      'Edycja wymaga skonfigurowanego Supabase. Uzupełnij dane w pliku .env / app.json.',
    deleteConfirm: 'Na pewno usunąć to ćwiczenie?',
    saved: 'Zapisano.',
  },

  common: {
    back: 'Wstecz',
    loading: 'Ładowanie…',
    none: 'brak',
    cancel: 'Anuluj',
    minutes: 'min',
    seconds: 's',
    perWeek: '/tydz.',
  },

  home2: {
    bodyMap: 'Wskaż miejsce na ciele',
    interview: 'Wywiad kliniczny',
    library: 'Biblioteka ćwiczeń',
    stats: 'Statystyki bazy',
  },

  bodyMap: {
    title: 'Mapa ciała',
    subtitle: 'Dotknij okolicy, która Cię boli.',
    front: 'Przód',
    back: 'Tył',
    selected: 'Wybrano:',
    continue: 'Kontynuuj wywiad',
    skip: 'Pomiń i opisz słownie',
  },

  interview: {
    title: 'Wywiad kliniczny',
    intro: 'Odpowiedz na kilka pytań — pomogą trafniej dobrać ćwiczenia.',
    progress: 'Pytanie',
    of: 'z maks.',
    finish: 'Zakończ i pokaż plan',
    generate: 'Generuj plan',
  },

  library: {
    title: 'Biblioteka ćwiczeń',
    search: 'Szukaj: objaw, schorzenie, nazwa (np. „GTPS”, „rwa kulszowa”)',
    filters: 'Filtry',
    region: 'Okolica',
    condition: 'Schorzenie',
    difficulty: 'Trudność',
    equipment: 'Sprzęt',
    all: 'Wszystkie',
    results: 'Wyniki',
    more: 'Pokaż więcej',
    empty: 'Brak wyników. Spróbuj innych słów.',
  },

  stats: {
    title: 'Statystyki bazy',
    total: 'Łącznie ćwiczeń',
    byRegion: 'Ćwiczenia wg okolicy',
    quality: 'Jakość treści',
    excellent: 'Doskonała',
    good: 'Dobra',
    needsReview: 'Do przeglądu',
  },

  studio: {
    title: 'Studio importu',
    subtitle: 'Wklej dane (JSON lub CSV), sprawdź i zaimportuj.',
    format: 'Format',
    json: 'JSON',
    csv: 'CSV',
    placeholder: 'Wklej tutaj zawartość pliku JSON lub CSV…',
    validate: 'Sprawdź',
    import: 'Importuj poprawne',
    report: 'Raport walidacji',
    valid: 'Poprawne',
    invalid: 'Błędne',
    duplicates: 'Duplikaty',
    suspicious: 'Podejrzane',
    autotag: 'Auto-tagowanie',
    translate: 'Tłumacz EN→PL',
    merge: 'Scal duplikaty',
    imported: 'Zaimportowano',
    zipNote: 'Wskazówka: wklej tablicę obiektów JSON lub plik CSV (pola tablicowe rozdziel znakiem |).',
    quality: 'Jakość',
  },

  plan2: {
    patientPdf: 'Generuj PDF dla pacjenta',
    safetyPlan: 'Plan bezpieczeństwa',
  },
} as const;
