import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isToday, isPast, parseISO, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { StatusBadge } from '@/components/StatusBadge';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Aufgaben } from '@/types/app';
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconList,
  IconPlus,
  IconCheck,
  IconArrowRight,
  IconTrophy,
  IconArrowLeft,
} from '@tabler/icons-react';

type FilterType = 'hoch' | 'heute' | 'alle';

const WIZARD_STEPS = [
  { label: 'Filter wählen' },
  { label: 'Abarbeiten' },
  { label: 'Abschluss' },
];

function isTaskOpen(task: Aufgaben): boolean {
  return !task.fields.aufgabe_erledigt;
}

function isOverdue(dateStr: string): boolean {
  try {
    const d = parseISO(dateStr);
    return !isToday(d) && isPast(d);
  } catch {
    return false;
  }
}

function isDueToday(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

function isHighPriority(task: Aufgaben): boolean {
  const key = task.fields.aufgabe_prioritaet?.key ?? '';
  const label = task.fields.aufgabe_prioritaet?.label ?? '';
  return key === 'hoch' || key === 'sehr_hoch' || label.toLowerCase().includes('hoch');
}

function isDueTodayOrOverdue(task: Aufgaben): boolean {
  const f = task.fields.aufgabe_faelligkeit;
  if (!f) return false;
  return isDueToday(f) || isOverdue(f);
}

function getFilteredTasks(tasks: Aufgaben[], filter: FilterType): Aufgaben[] {
  const open = tasks.filter(isTaskOpen);
  switch (filter) {
    case 'hoch':
      return open.filter(isHighPriority);
    case 'heute':
      return open.filter(isDueTodayOrOverdue);
    case 'alle':
      return open;
  }
}

export default function AufgabenAbarbeitenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { aufgaben, kategorien, loading, error, fetchAll, kategorienMap } = useDashboardData();

  const initialStep = (() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 3) return urlStep;
    return 1;
  })();

  const initialFilter = (() => {
    const f = searchParams.get('filter');
    if (f === 'hoch' || f === 'heute' || f === 'alle') return f as FilterType;
    return null;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedFilter, setSelectedFilter] = useState<FilterType | null>(initialFilter);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [doneInSession, setDoneInSession] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Sync step + filter to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedFilter) {
      params.set('filter', selectedFilter);
    } else {
      params.delete('filter');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedFilter, searchParams, setSearchParams]);

  // If filter was pre-set via URL, advance to step 2 on mount
  useEffect(() => {
    if (initialFilter && initialStep === 1) {
      setCurrentStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = useMemo(() => {
    if (!selectedFilter) return [];
    return getFilteredTasks(aufgaben, selectedFilter);
  }, [aufgaben, selectedFilter]);

  // Tasks still pending in step 2 (not done, not skipped)
  const pendingTasks = useMemo(() => {
    return filteredTasks.filter(t => !t.fields.aufgabe_erledigt && !skippedIds.has(t.record_id));
  }, [filteredTasks, skippedIds]);

  const totalDone = useMemo(() => aufgaben.filter(t => t.fields.aufgabe_erledigt).length, [aufgaben]);
  const totalOpen = useMemo(() => aufgaben.filter(isTaskOpen).length, [aufgaben]);

  // Count stats for filter cards
  const countHigh = useMemo(() => aufgaben.filter(t => isTaskOpen(t) && isHighPriority(t)).length, [aufgaben]);
  const countToday = useMemo(() => aufgaben.filter(t => isTaskOpen(t) && isDueTodayOrOverdue(t)).length, [aufgaben]);
  const countAll = useMemo(() => aufgaben.filter(isTaskOpen).length, [aufgaben]);

  // Progress in current session
  const sessionTotal = filteredTasks.length;
  const sessionDoneCount = filteredTasks.filter(t => t.fields.aufgabe_erledigt).length;
  const progressPercent = sessionTotal > 0 ? Math.round((sessionDoneCount / sessionTotal) * 100) : 0;

  // Auto-advance when all pending tasks are cleared
  useEffect(() => {
    if (currentStep === 2 && selectedFilter !== null && sessionTotal > 0 && pendingTasks.length === 0) {
      const timer = setTimeout(() => setCurrentStep(3), 600);
      return () => clearTimeout(timer);
    }
  }, [currentStep, selectedFilter, sessionTotal, pendingTasks.length]);

  async function handleMarkDone(task: Aufgaben) {
    setMarkingId(task.record_id);
    try {
      await LivingAppsService.updateAufgabenEntry(task.record_id, { aufgabe_erledigt: true });
      setDoneInSession(prev => prev + 1);
      await fetchAll();
    } catch (e) {
      console.error('Fehler beim Markieren:', e);
    } finally {
      setMarkingId(null);
    }
  }

  function handleSkip(task: Aufgaben) {
    setSkippedIds(prev => new Set([...prev, task.record_id]));
  }

  function handleSelectFilter(filter: FilterType) {
    setSelectedFilter(filter);
    setSkippedIds(new Set());
    setDoneInSession(0);
    setCurrentStep(2);
  }

  function handleRestart() {
    setSelectedFilter(null);
    setSkippedIds(new Set());
    setDoneInSession(0);
    setCurrentStep(1);
  }

  function getKategorieName(task: Aufgaben): string | null {
    const url = task.fields.aufgabe_kategorie;
    if (!url) return null;
    const id = extractRecordId(url);
    if (!id) return null;
    const kat = kategorienMap.get(id);
    return kat?.fields.kategorie_name ?? null;
  }

  function formatFaelligkeit(dateStr: string): string {
    try {
      return format(parseISO(dateStr), 'd. MMM yyyy', { locale: de });
    } catch {
      return dateStr;
    }
  }

  return (
    <IntentWizardShell
      title="Aufgaben abarbeiten"
      subtitle="Arbeite fokussiert durch deine offenen Aufgaben."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Filter wählen */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Hohe Priorität */}
            <button
              onClick={() => handleSelectFilter('hoch')}
              className="group text-left rounded-2xl border bg-card p-6 hover:border-primary hover:shadow-md transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <IconAlertTriangle size={22} className="text-red-600" stroke={2} />
                </div>
                <span className="text-4xl font-bold text-foreground">{countHigh}</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Hohe Priorität</div>
                <div className="text-sm text-muted-foreground mt-0.5">Aufgaben mit hoher oder sehr hoher Priorität</div>
              </div>
            </button>

            {/* Heute fällig */}
            <button
              onClick={() => handleSelectFilter('heute')}
              className="group text-left rounded-2xl border bg-card p-6 hover:border-primary hover:shadow-md transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <IconCalendarDue size={22} className="text-amber-600" stroke={2} />
                </div>
                <span className="text-4xl font-bold text-foreground">{countToday}</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Heute fällig</div>
                <div className="text-sm text-muted-foreground mt-0.5">Heute oder bereits überfällige Aufgaben</div>
              </div>
            </button>

            {/* Alle offenen */}
            <button
              onClick={() => handleSelectFilter('alle')}
              className="group text-left rounded-2xl border bg-card p-6 hover:border-primary hover:shadow-md transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <IconList size={22} className="text-blue-600" stroke={2} />
                </div>
                <span className="text-4xl font-bold text-foreground">{countAll}</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Alle offenen</div>
                <div className="text-sm text-muted-foreground mt-0.5">Alle noch nicht erledigten Aufgaben</div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <IconPlus size={16} className="mr-2" stroke={2} />
              Neue Aufgabe erstellen
            </Button>
          </div>

          <AufgabenDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createAufgabenEntry(fields);
              await fetchAll();
            }}
            defaultValues={undefined}
            kategorienList={kategorien}
            enablePhotoScan={false}
            enablePhotoLocation={false}
          />
        </div>
      )}

      {/* Step 2: Aufgaben abarbeiten */}
      {currentStep === 2 && selectedFilter !== null && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {sessionDoneCount} von {sessionTotal} erledigt
              </span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Task cards */}
          {pendingTasks.length === 0 && sessionTotal > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                <IconCheck size={28} className="text-green-600" stroke={2.5} />
              </div>
              <div>
                <div className="font-semibold text-foreground text-lg">Alle abgearbeitet!</div>
                <div className="text-sm text-muted-foreground mt-1">Du hast alle Aufgaben in dieser Sitzung erledigt.</div>
              </div>
            </div>
          ) : pendingTasks.length === 0 && sessionTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <IconList size={28} className="text-muted-foreground" stroke={1.5} />
              </div>
              <div>
                <div className="font-semibold text-foreground">Keine Aufgaben gefunden</div>
                <div className="text-sm text-muted-foreground mt-1">Für diesen Filter gibt es keine offenen Aufgaben.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const faelligkeit = task.fields.aufgabe_faelligkeit;
                const isTaskOverdue = faelligkeit ? isOverdue(faelligkeit) : false;
                const isTaskDueToday = faelligkeit ? isDueToday(faelligkeit) : false;
                const kategorieName = getKategorieName(task);
                const isMarking = markingId === task.record_id;

                return (
                  <div
                    key={task.record_id}
                    className="rounded-2xl border bg-card p-5 overflow-hidden"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="font-semibold text-foreground truncate">
                          {task.fields.aufgabe_titel ?? '(Kein Titel)'}
                        </div>

                        {task.fields.aufgabe_beschreibung && (
                          <p className="text-sm text-muted-foreground line-clamp-2 min-w-0">
                            {task.fields.aufgabe_beschreibung}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {task.fields.aufgabe_prioritaet && (
                            <StatusBadge
                              statusKey={task.fields.aufgabe_prioritaet.key}
                              label={task.fields.aufgabe_prioritaet.label}
                            />
                          )}

                          {faelligkeit && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                isTaskOverdue
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : isTaskDueToday
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {isTaskOverdue ? 'Überfällig: ' : isTaskDueToday ? 'Heute: ' : ''}
                              {formatFaelligkeit(faelligkeit)}
                            </span>
                          )}

                          {kategorieName && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                              {kategorieName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1"
                        onClick={() => handleMarkDone(task)}
                        disabled={isMarking}
                      >
                        {isMarking ? (
                          <span className="flex items-center gap-1.5">
                            <IconCheck size={16} stroke={2.5} />
                            Speichern...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <IconCheck size={16} stroke={2.5} />
                            Erledigt
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSkip(task)}
                        disabled={isMarking}
                      >
                        <IconArrowRight size={16} stroke={2} />
                        <span className="ml-1.5">Uberspringen</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <IconArrowLeft size={16} className="mr-1.5" stroke={2} />
              Filter ändern
            </Button>
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Fertig
              <IconArrowRight size={16} className="ml-1.5" stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Abschluss */}
      {currentStep === 3 && (
        <div className="space-y-8">
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <IconTrophy size={40} className="text-primary" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Gut gemacht!</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">
                Du hast in dieser Sitzung{' '}
                <span className="font-semibold text-foreground">{doneInSession}</span>{' '}
                {doneInSession === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-2">
              <div className="rounded-2xl border bg-card p-4 text-center overflow-hidden">
                <div className="text-3xl font-bold text-foreground">{totalDone}</div>
                <div className="text-xs text-muted-foreground mt-1">Insgesamt erledigt</div>
              </div>
              <div className="rounded-2xl border bg-card p-4 text-center overflow-hidden">
                <div className="text-3xl font-bold text-foreground">{totalOpen}</div>
                <div className="text-xs text-muted-foreground mt-1">Noch offen</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleRestart}>
              <IconArrowLeft size={16} className="mr-1.5" stroke={2} />
              Weitere Aufgaben
            </Button>
            <Button asChild>
              <a href="#/aufgaben">
                <IconList size={16} className="mr-1.5" stroke={2} />
                Alle Aufgaben ansehen
              </a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
