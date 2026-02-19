// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie_name?: string;
    kategorie_beschreibung?: string;
    kategorie_farbe?: 'rot' | 'blau' | 'gruen' | 'orange' | 'lila' | 'grau' | 'gelb';
  };
}

export interface Aufgaben {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    aufgabe_titel?: string;
    aufgabe_beschreibung?: string;
    aufgabe_faelligkeit?: string; // Format: YYYY-MM-DD oder ISO String
    aufgabe_prioritaet?: 'niedrig' | 'mittel' | 'hoch' | 'sehr_hoch';
    aufgabe_kategorie?: string; // applookup -> URL zu 'Kategorien' Record
    aufgabe_erledigt?: boolean;
  };
}

export const APP_IDS = {
  KATEGORIEN: '6997691c70d60eee9c1ba546',
  AUFGABEN: '6997691f9dfd8dc4cf1a38f4',
} as const;

// Helper Types for creating new records
export type CreateKategorien = Kategorien['fields'];
export type CreateAufgaben = Aufgaben['fields'];