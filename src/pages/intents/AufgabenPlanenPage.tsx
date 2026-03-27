import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { KategorienDialog } from '@/components/dialogs/KategorienDialog';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Kategorien, Aufgaben } from '@/types/app';
import {
  IconPlus,
  IconCheck,
  IconTag,
  IconListCheck,
  IconChartBar,
  IconArrowLeft,
  IconFlag,
  IconCircleCheck,
} from '@tabler/icons-react';

const PRIORITY_COLOR: Record<string, string> = {
  niedrig: 'bg-blue-100 text-blue-700 border-blue-200',
  mittel: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hoch: 'bg-orange-100 text-orange-700 border-orange-200',
  sehr_hoch: 'bg-red-100 text-red-700 border-red-200',
};

const FARBE_COLOR: Record<string, string> = {
  rot: 'bg-red-100 text-red-700 border-red-200',
  blau: 'bg-blue-100 text-blue-700 border-blue-200',
  gruen: 'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  lila: 'bg-purple-100 text-purple-700 border-purple-200',
  grau: 'bg-gray-100 text-gray-600 border-gray-200',
  gelb: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const WIZARD_STEPS = [
  { label: 'Kategorie wählen' },
  { label: 'Aufgaben planen' },
  { label: 'Übersicht' },
];

export default function AufgabenPlanenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial step and kategorie from URL
  const initialKategorieId = searchParams.get('kategorieId') ?? null;
  const initialStep = initialKategorieId
    ? (parseInt(searchParams.get('step') ?? '2', 10) || 2)
    : (parseInt(searchParams.get('step') ?? '1', 10) || 1);

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [selectedKategorieId, setSelectedKategorieId] = useState<string | null>(initialKategorieId);
  const [kategorieDialogOpen, setKategorieDialogOpen] = useState(false);
  const [aufgabeDialogOpen, setAufgabeDialogOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const { aufgaben, kategorien, loading, error, fetchAll } = useDashboardData();

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(currentStep));
    if (selectedKategorieId) {
      params.set('kategorieId', selectedKategorieId);
    } else {
      params.delete('kategorieId');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedKategorieId, searchParams, setSearchParams]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const selectedKategorie: Kategorien | undefined = useMemo(
    () => kategorien.find(k => k.record_id === selectedKategorieId),
    [kategorien, selectedKategorieId]
  );

  const kategorieAufgaben: Aufgaben[] = useMemo(() => {
    if (!selectedKategorieId) return [];
    return aufgaben.filter(a => {
      const katId = extractRecordId(a.fields.aufgabe_kategorie);
      return katId === selectedKategorieId;
    });
  }, [aufgaben, selectedKategorieId]);

  const completedCount = useMemo(
    () => kategorieAufgaben.filter(a => a.fields.aufgabe_erledigt).length,
    [kategorieAufgaben]
  );
  const totalCount = kategorieAufgaben.length;
  const pendingCount = totalCount - completedCount;

  const pendingByPriority = useMemo(() => {
    const pending = kategorieAufgaben.filter(a => !a.fields.aufgabe_erledigt);
    const groups: Record<string, number> = {};
    pending.forEach(a => {
      const key = (a.fields.aufgabe_prioritaet as { key: string; label: string } | undefined)?.key ?? 'ohne';
      groups[key] = (groups[key] ?? 0) + 1;
    });
    return groups;
  }, [kategorieAufgaben]);

  async function handleToggleErledigt(aufgabe: Aufgaben) {
    if (toggling === aufgabe.record_id) return;
    setToggling(aufgabe.record_id);
    try {
      await LivingAppsService.updateAufgabenEntry(aufgabe.record_id, {
        aufgabe_erledigt: !aufgabe.fields.aufgabe_erledigt,
      });
      await fetchAll();
    } finally {
      setToggling(null);
    }
  }

  function handleSelectKategorie(id: string) {
    setSelectedKategorieId(id);
    setCurrentStep(2);
  }

  function handleNewKategorieCreated() {
    setKategorieDialogOpen(false);
    void fetchAll();
  }

  function handleNewAufgabeCreated() {
    setAufgabeDialogOpen(false);
    void fetchAll();
  }

  // --- Step 1: Kategorie wählen ---
  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Kategorie auswählen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Wähle eine Kategorie aus, um deren Aufgaben zu planen.
          </p>
        </div>
        <EntitySelectStep
          items={kategorien.map(k => ({
            id: k.record_id,
            title: k.fields.kategorie_name ?? '(Ohne Name)',
            subtitle: k.fields.kategorie_beschreibung,
            status: k.fields.kategorie_farbe
              ? { key: (k.fields.kategorie_farbe as { key: string; label: string }).key, label: (k.fields.kategorie_farbe as { key: string; label: string }).label }
              : undefined,
            icon: <IconTag size={18} className="text-primary" stroke={1.5} />,
          }))}
          onSelect={handleSelectKategorie}
          searchPlaceholder="Kategorie suchen..."
          emptyIcon={<IconTag size={32} />}
          emptyText="Noch keine Kategorien vorhanden."
          createLabel="Neue Kategorie erstellen"
          onCreateNew={() => setKategorieDialogOpen(true)}
          createDialog={
            <KategorienDialog
              open={kategorieDialogOpen}
              onClose={() => setKategorieDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createKategorienEntry(fields);
                handleNewKategorieCreated();
              }}
              defaultValues={undefined}
              enablePhotoScan={false}
              enablePhotoLocation={false}
            />
          }
        />
      </div>
    );
  }

  // --- Step 2: Aufgaben anlegen ---
  function renderStep2() {
    const farbe = selectedKategorie?.fields.kategorie_farbe as { key: string; label: string } | undefined;
    const farbeClass = farbe ? (FARBE_COLOR[farbe.key] ?? 'bg-gray-100 text-gray-600 border-gray-200') : 'bg-gray-100 text-gray-600 border-gray-200';

    return (
      <div className="space-y-4">
        {/* Category header */}
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconTag size={20} className="text-primary" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base truncate">
                {selectedKategorie?.fields.kategorie_name ?? '(Ohne Name)'}
              </span>
              {farbe && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${farbeClass}`}>
                  {farbe.label}
                </span>
              )}
            </div>
            {selectedKategorie?.fields.kategorie_beschreibung && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {selectedKategorie.fields.kategorie_beschreibung}
              </p>
            )}
          </div>
        </div>

        {/* Live counter */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span> Aufgaben,{' '}
            <span className="font-semibold text-foreground">{completedCount}</span> erledigt
          </p>
          <Button onClick={() => setAufgabeDialogOpen(true)} size="sm" className="gap-1.5">
            <IconPlus size={15} stroke={2} />
            Neue Aufgabe
          </Button>
        </div>

        {/* Task list */}
        {kategorieAufgaben.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
            <div className="mb-3 flex justify-center opacity-40">
              <IconListCheck size={36} stroke={1.2} />
            </div>
            <p className="text-sm">Noch keine Aufgaben in dieser Kategorie.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAufgabeDialogOpen(true)}
              className="mt-3 gap-1.5"
            >
              <IconPlus size={14} />
              Erste Aufgabe anlegen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {kategorieAufgaben.map(aufgabe => {
              const prioritaet = aufgabe.fields.aufgabe_prioritaet as { key: string; label: string } | undefined;
              const erledigt = !!aufgabe.fields.aufgabe_erledigt;
              const isToggling = toggling === aufgabe.record_id;
              const prioClass = prioritaet ? (PRIORITY_COLOR[prioritaet.key] ?? 'bg-gray-100 text-gray-600 border-gray-200') : null;

              return (
                <div
                  key={aufgabe.record_id}
                  className={`flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden transition-opacity ${erledigt ? 'opacity-60' : ''}`}
                >
                  <button
                    onClick={() => handleToggleErledigt(aufgabe)}
                    disabled={isToggling}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      erledigt
                        ? 'border-green-500 bg-green-500'
                        : 'border-muted-foreground/40 hover:border-primary'
                    }`}
                    aria-label={erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
                  >
                    {erledigt && <IconCheck size={12} stroke={3} className="text-white" />}
                    {isToggling && !erledigt && (
                      <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm truncate ${erledigt ? 'line-through text-muted-foreground' : ''}`}>
                        {aufgabe.fields.aufgabe_titel ?? '(Ohne Titel)'}
                      </span>
                      {prioritaet && prioClass && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${prioClass}`}>
                          {prioritaet.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fällig: {formatDate(aufgabe.fields.aufgabe_faelligkeit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog for new task */}
        <AufgabenDialog
          open={aufgabeDialogOpen}
          onClose={() => setAufgabeDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createAufgabenEntry(fields);
            handleNewAufgabeCreated();
          }}
          defaultValues={
            selectedKategorieId
              ? { aufgabe_kategorie: createRecordUrl(APP_IDS.KATEGORIEN, selectedKategorieId) }
              : undefined
          }
          kategorienList={kategorien}
          enablePhotoScan={false}
          enablePhotoLocation={false}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-1.5">
            <IconArrowLeft size={15} stroke={2} />
            Kategorie ändern
          </Button>
          <Button onClick={() => setCurrentStep(3)} className="gap-1.5">
            Weiter zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  // --- Step 3: Zusammenfassung ---
  function renderStep3() {
    const farbe = selectedKategorie?.fields.kategorie_farbe as { key: string; label: string } | undefined;
    const farbeClass = farbe ? (FARBE_COLOR[farbe.key] ?? 'bg-gray-100 text-gray-600 border-gray-200') : 'bg-gray-100 text-gray-600 border-gray-200';
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const priorityLabels: Record<string, string> = {
      niedrig: 'Niedrig',
      mittel: 'Mittel',
      hoch: 'Hoch',
      sehr_hoch: 'Sehr hoch',
      ohne: 'Ohne Priorität',
    };

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Zusammenfassung</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hier siehst du den aktuellen Stand deiner Aufgabenplanung.
          </p>
        </div>

        {/* Category summary card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <IconTag size={18} className="text-primary shrink-0" stroke={1.5} />
              <span className="font-semibold truncate">
                {selectedKategorie?.fields.kategorie_name ?? '(Ohne Name)'}
              </span>
              {farbe && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${farbeClass}`}>
                  {farbe.label}
                </span>
              )}
            </div>
            {selectedKategorie?.fields.kategorie_beschreibung && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {selectedKategorie.fields.kategorie_beschreibung}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gesamt</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Erledigt</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Offen</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground flex items-center gap-1.5">
              <IconCircleCheck size={15} stroke={2} />
              Fortschritt
            </span>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Erledigt: <span className="font-semibold text-foreground">{completedCount}</span>
            </span>
            <span>von {totalCount} Aufgaben</span>
          </div>
        </div>

        {/* Pending by priority */}
        {pendingCount > 0 && Object.keys(pendingByPriority).length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <IconFlag size={16} className="text-muted-foreground shrink-0" stroke={1.5} />
              <h3 className="text-sm font-semibold">Offene Aufgaben nach Priorität</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(pendingByPriority).map(([key, count]) => {
                const prioClass = PRIORITY_COLOR[key] ?? 'bg-gray-100 text-gray-600 border-gray-200';
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${prioClass}`}>
                      {priorityLabels[key] ?? key}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(2)}
            className="gap-1.5"
          >
            <IconPlus size={15} stroke={2} />
            Neue Aufgabe hinzufügen
          </Button>
          <Button
            onClick={() => { window.location.hash = '/aufgaben'; }}
            className="gap-1.5"
          >
            <IconChartBar size={15} stroke={2} />
            Fertig
          </Button>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Aufgaben planen"
      subtitle="Plane Aufgaben Schritt fur Schritt innerhalb einer Kategorie."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </IntentWizardShell>
  );
}
