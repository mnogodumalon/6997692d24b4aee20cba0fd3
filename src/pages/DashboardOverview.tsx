import { useState, useEffect } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Aufgaben, Kategorien } from '@/types/app';
import { PageShell } from '@/components/PageShell';

export default function DashboardOverview() {
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [a, k] = await Promise.all([
          LivingAppsService.getAufgaben(),
          LivingAppsService.getKategorien(),
        ]);
        setAufgaben(a);
        setKategorien(k);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = aufgaben.length;
  const erledigt = aufgaben.filter(r => r.fields.aufgabe_erledigt).length;
  const offen = total - erledigt;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell title="Dashboard" subtitle="Übersicht aller Aufgaben und Kategorien">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Aufgaben gesamt</p>
          <p className="text-4xl font-semibold mt-2">{total}</p>
        </div>
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Offen</p>
          <p className="text-4xl font-semibold mt-2">{offen}</p>
        </div>
        <div className="rounded-[27px] bg-card shadow-lg p-6">
          <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Erledigt</p>
          <p className="text-4xl font-semibold mt-2">{erledigt}</p>
        </div>
      </div>
      <div className="rounded-[27px] bg-card shadow-lg p-6">
        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-4">Kategorien ({kategorien.length})</p>
        {kategorien.length === 0 ? (
          <p className="text-muted-foreground">Keine Kategorien vorhanden.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {kategorien.map(k => (
              <span key={k.record_id} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-3 py-1 text-sm font-medium">
                {k.fields.kategorie_name ?? '—'}
              </span>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
