import type { Aufgaben } from './app';

export type EnrichedAufgaben = Aufgaben & {
  aufgabe_kategorieName: string;
};
