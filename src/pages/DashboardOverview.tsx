import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAufgaben } from '@/lib/enrich';
import type { EnrichedAufgaben } from '@/types/enriched';
import type { Kategorien } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconPlus, IconCircleCheck, IconCircle, IconTrash,
  IconPencil, IconListCheck, IconAlertTriangle, IconClock, IconTag,
  IconFilter, IconSquareCheck, IconRocket, IconChevronRight,
  IconCalendarPlus, IconPlayerPlay, IconZoomCheck,
} from '@tabler/icons-react';

type PrioFilter = 'alle' | 'niedrig' | 'mittel' | 'hoch' | 'sehr_hoch';
type StatusFilter = 'offen' | 'erledigt' | 'alle';

const PRIO_COLORS: Record<string, string> = {
  niedrig: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  mittel: 'bg-amber-100 text-amber-700 border-amber-200',
  hoch: 'bg-orange-100 text-orange-700 border-orange-200',
  sehr_hoch: 'bg-red-100 text-red-700 border-red-200',
};

const KATEGORIE_COLORS: Record<string, string> = {
  rot: 'bg-red-400',
  blau: 'bg-blue-400',
  gruen: 'bg-emerald-400',
  orange: 'bg-orange-400',
  lila: 'bg-purple-400',
  grau: 'bg-gray-400',
  gelb: 'bg-yellow-400',
};

function isOverdue(dateStr?: string, erledigt?: boolean): boolean {
  if (!dateStr || erledigt) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function isDueSoon(dateStr?: string, erledigt?: boolean): boolean {
  if (!dateStr || erledigt) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

export default function DashboardOverview() {
  const {
    aufgaben, kategorien,
    kategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAufgaben = enrichAufgaben(aufgaben, { kategorienMap });

  const [prioFilter, setPrioFilter] = useState<PrioFilter>('alle');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('offen');
  const [katFilter, setKatFilter] = useState<string>('alle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedAufgaben | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedAufgaben | null>(null);

  const filtered = useMemo(() => {
    return enrichedAufgaben.filter(a => {
      if (statusFilter === 'offen' && a.fields.aufgabe_erledigt) return false;
      if (statusFilter === 'erledigt' && !a.fields.aufgabe_erledigt) return false;
      if (prioFilter !== 'alle' && a.fields.aufgabe_prioritaet?.key !== prioFilter) return false;
      if (katFilter !== 'alle' && a.aufgabe_kategorieName !== katFilter) return false;
      return true;
    });
  }, [enrichedAufgaben, prioFilter, statusFilter, katFilter]);

  const stats = useMemo(() => {
    const gesamt = aufgaben.length;
    const erledigt = aufgaben.filter(a => a.fields.aufgabe_erledigt).length;
    const offen = gesamt - erledigt;
    const ueberfaellig = aufgaben.filter(a => isOverdue(a.fields.aufgabe_faelligkeit, a.fields.aufgabe_erledigt)).length;
    const baldFaellig = aufgaben.filter(a => isDueSoon(a.fields.aufgabe_faelligkeit, a.fields.aufgabe_erledigt)).length;
    return { gesamt, erledigt, offen, ueberfaellig, baldFaellig };
  }, [aufgaben]);

  const kategorienList: Kategorien[] = kategorien;

  const handleToggleErledigt = useCallback(async (a: EnrichedAufgaben) => {
    await LivingAppsService.updateAufgabenEntry(a.record_id, {
      aufgabe_erledigt: !a.fields.aufgabe_erledigt,
    });
    fetchAll();
  }, [fetchAll]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteAufgabenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }, [deleteTarget, fetchAll]);

  const handleOpenCreate = useCallback(() => {
    setEditRecord(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((a: EnrichedAufgaben) => {
    setEditRecord(a);
    setDialogOpen(true);
  }, []);

  const katNames = useMemo(() => {
    const names = new Set<string>();
    enrichedAufgaben.forEach(a => { if (a.aufgabe_kategorieName) names.add(a.aufgabe_kategorieName); });
    return Array.from(names).sort();
  }, [enrichedAufgaben]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflows */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={16} className="text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="#/intents/aufgaben-planen"
            className="flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconCalendarPlus size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Aufgaben planen</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Kategorie wählen und neue Aufgaben mit Priorität und Fälligkeit anlegen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </a>
          <a
            href="#/intents/aufgaben-abarbeiten"
            className="flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconPlayerPlay size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Aufgaben abarbeiten</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Offene Aufgaben nach Priorität oder Fälligkeit abarbeiten und als erledigt markieren</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </a>
          <a
            href="#/intents/aufgaben-ueberpruefen"
            className="flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconZoomCheck size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Aufgaben überprüfen</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Überfällige Aufgaben bereinigen: neu terminieren, als erledigt markieren oder löschen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aufgaben</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.offen} offen · {stats.erledigt} erledigt
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neue Aufgabe
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Aufgaben ausstehend"
          icon={<IconCircle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Erledigt"
          value={String(stats.erledigt)}
          description={stats.gesamt > 0 ? `${Math.round((stats.erledigt / stats.gesamt) * 100)}% abgeschlossen` : 'Keine Aufgaben'}
          icon={<IconCircleCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(stats.ueberfaellig)}
          description="Frist überschritten"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bald fällig"
          value={String(stats.baldFaellig)}
          description="In den nächsten 3 Tagen"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <IconFilter size={14} className="text-muted-foreground shrink-0" />

        {/* Status */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['offen', 'alle', 'erledigt'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'offen' ? 'Offen' : s === 'erledigt' ? 'Erledigt' : 'Alle'}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex flex-wrap gap-1">
          {(['alle', ...LOOKUP_OPTIONS['aufgaben'].aufgabe_prioritaet.map(o => o.key)] as PrioFilter[]).map(p => {
            const opt = LOOKUP_OPTIONS['aufgaben'].aufgabe_prioritaet.find(o => o.key === p);
            return (
              <button
                key={p}
                onClick={() => setPrioFilter(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  prioFilter === p
                    ? (p === 'alle' ? 'bg-foreground text-background border-foreground' : (PRIO_COLORS[p] ?? 'bg-primary text-primary-foreground') + ' border-current')
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {p === 'alle' ? 'Alle Prioritäten' : opt?.label ?? p}
              </button>
            );
          })}
        </div>

        {/* Kategorie filter */}
        {katNames.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <IconTag size={12} className="text-muted-foreground shrink-0" />
            <button
              onClick={() => setKatFilter('alle')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                katFilter === 'alle' ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              Alle Kategorien
            </button>
            {katNames.map(name => (
              <button
                key={name}
                onClick={() => setKatFilter(name === katFilter ? 'alle' : name)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  katFilter === name ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <IconSquareCheck size={48} stroke={1.5} className="text-muted-foreground" />
            <p className="text-muted-foreground text-sm font-medium">
              {statusFilter === 'erledigt' ? 'Noch nichts erledigt' : statusFilter === 'offen' ? 'Alle Aufgaben erledigt!' : 'Keine Aufgaben'}
            </p>
            <Button variant="outline" size="sm" onClick={handleOpenCreate}>
              <IconPlus size={14} className="mr-1 shrink-0" /> Aufgabe hinzufügen
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((a) => {
              const overdue = isOverdue(a.fields.aufgabe_faelligkeit, a.fields.aufgabe_erledigt);
              const dueSoon = isDueSoon(a.fields.aufgabe_faelligkeit, a.fields.aufgabe_erledigt);
              const prioKey = a.fields.aufgabe_prioritaet?.key ?? '';
              const prioLabel = a.fields.aufgabe_prioritaet?.label;
              const katFarbe = (() => {
                const katId = a.fields.aufgabe_kategorie;
                if (!katId) return null;
                const idMatch = katId.match(/([a-f0-9]{24})$/i);
                if (!idMatch) return null;
                const kat = kategorienMap.get(idMatch[1]);
                return kat?.fields.kategorie_farbe?.key ?? null;
              })();

              return (
                <li
                  key={a.record_id}
                  className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                    a.fields.aufgabe_erledigt ? 'opacity-60' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleErledigt(a)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={a.fields.aufgabe_erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
                  >
                    {a.fields.aufgabe_erledigt
                      ? <IconCircleCheck size={20} className="text-primary" />
                      : <IconCircle size={20} />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium text-sm truncate ${a.fields.aufgabe_erledigt ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {a.fields.aufgabe_titel ?? '(Kein Titel)'}
                      </span>
                      {prioLabel && prioKey && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIO_COLORS[prioKey] ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {prioLabel}
                        </span>
                      )}
                    </div>
                    {a.fields.aufgabe_beschreibung && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {a.fields.aufgabe_beschreibung}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {a.fields.aufgabe_faelligkeit && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${
                          overdue ? 'text-red-600' : dueSoon ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          <IconClock size={12} className="shrink-0" />
                          {overdue ? 'Überfällig: ' : ''}{formatDate(a.fields.aufgabe_faelligkeit)}
                        </span>
                      )}
                      {a.aufgabe_kategorieName && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {katFarbe && (
                            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${KATEGORIE_COLORS[katFarbe] ?? 'bg-gray-400'}`} />
                          )}
                          {a.aufgabe_kategorieName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions — always visible */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Bearbeiten"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Löschen"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Kategorien overview */}
      {kategorienList.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <IconListCheck size={16} className="text-muted-foreground shrink-0" />
            <h2 className="text-sm font-semibold text-foreground">Kategorien</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {kategorienList.map(k => {
              const farbe = k.fields.kategorie_farbe?.key ?? 'grau';
              const count = aufgaben.filter(a => {
                const m = a.fields.aufgabe_kategorie?.match(/([a-f0-9]{24})$/i);
                return m ? m[1] === k.record_id : false;
              }).length;
              return (
                <button
                  key={k.record_id}
                  onClick={() => {
                    const name = k.fields.kategorie_name ?? '';
                    setKatFilter(katFilter === name ? 'alle' : name);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                    katFilter === (k.fields.kategorie_name ?? '') ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${KATEGORIE_COLORS[farbe] ?? 'bg-gray-400'}`} />
                  {k.fields.kategorie_name ?? '—'}
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{count}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AufgabenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateAufgabenEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createAufgabenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord ? {
          ...editRecord.fields,
          aufgabe_kategorie: editRecord.fields.aufgabe_kategorie
            ? editRecord.fields.aufgabe_kategorie
            : undefined,
        } : undefined}
        kategorienList={kategorienList}
        enablePhotoScan={AI_PHOTO_SCAN['Aufgaben']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufgaben']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Aufgabe löschen"
        description={`Soll "${deleteTarget?.fields.aufgabe_titel ?? 'diese Aufgabe'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
