// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Aufgaben {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    aufgabe_titel?: string;
    aufgabe_beschreibung?: string;
    aufgabe_faelligkeit?: string; // Format: YYYY-MM-DD oder ISO String
    aufgabe_prioritaet?: LookupValue;
    aufgabe_kategorie?: string; // applookup -> URL zu 'Kategorien' Record
    aufgabe_erledigt?: boolean;
  };
}

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie_name?: string;
    kategorie_beschreibung?: string;
    kategorie_farbe?: LookupValue;
  };
}

export const APP_IDS = {
  AUFGABEN: '6997691f9dfd8dc4cf1a38f4',
  KATEGORIEN: '6997691c70d60eee9c1ba546',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'aufgaben': {
    aufgabe_prioritaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "sehr_hoch", label: "Sehr hoch" }],
  },
  'kategorien': {
    kategorie_farbe: [{ key: "rot", label: "Rot" }, { key: "blau", label: "Blau" }, { key: "gruen", label: "Grün" }, { key: "orange", label: "Orange" }, { key: "lila", label: "Lila" }, { key: "grau", label: "Grau" }, { key: "gelb", label: "Gelb" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'aufgaben': {
    'aufgabe_titel': 'string/text',
    'aufgabe_beschreibung': 'string/textarea',
    'aufgabe_faelligkeit': 'date/date',
    'aufgabe_prioritaet': 'lookup/select',
    'aufgabe_kategorie': 'applookup/select',
    'aufgabe_erledigt': 'bool',
  },
  'kategorien': {
    'kategorie_name': 'string/text',
    'kategorie_beschreibung': 'string/textarea',
    'kategorie_farbe': 'lookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateAufgaben = StripLookup<Aufgaben['fields']>;
export type CreateKategorien = StripLookup<Kategorien['fields']>;