import type { EnrichedAufgaben } from '@/types/enriched';
import type { Aufgaben, Kategorien } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AufgabenMaps {
  kategorienMap: Map<string, Kategorien>;
}

export function enrichAufgaben(
  aufgaben: Aufgaben[],
  maps: AufgabenMaps
): EnrichedAufgaben[] {
  return aufgaben.map(r => ({
    ...r,
    aufgabe_kategorieName: resolveDisplay(r.fields.aufgabe_kategorie, maps.kategorienMap, 'kategorie_name'),
  }));
}
