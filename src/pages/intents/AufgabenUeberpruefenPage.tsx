import { useState, useMemo } from 'react';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { AufgabenDialog } from '@/components/dialogs/AufgabenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Aufgaben } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import {
  IconAlertTriangle,
  IconCheck,
  IconTrash,
  IconPencil,
  IconArrowLeft,
  IconArrowRight,
  IconTrophy,
  IconClockExclamation,
  IconCalendarOff,
  IconCircleCheck,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Überblick' },
  { label: 'Bereinigen' },
  { label: 'Fertig' },
];

function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

const PRIO_COLORS: Record<string, string> = {
  niedrig: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  mittel: 'bg-amber-100 text-amber-700 border-amber-200',
  hoch: 'bg-orange-100 text-orange-700 border-orange-200',
  sehr_hoch: 'bg-red-100 text-red-700 border-red-200',
};

export default function AufgabenUeberpruefenPage() {
  const { aufgaben, kategorien, loading, error, fetchAll } = useDashboardData();

  const [currentStep, setCurrentStep] = useState(1);
  const [editTarget, setEditTarget] = useState<Aufgaben | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Aufgaben | null>(null);
  const [markedDone, setMarkedDone] = useState(0);
  const [deleted, setDeleted] = useState(0);
  const [rescheduled, setRescheduled] = useState(0);

  const overdueOpen = useMemo(
    () => aufgaben.filter(a => !a.fields.aufgabe_erledigt && isOverdue(a.fields.aufgabe_faelligkeit)),
    [aufgaben]
  );

  const noDateOpen = useMemo(
    () => aufgaben.filter(a => !a.fields.aufgabe_erledigt && !a.fields.aufgabe_faelligkeit),
    [aufgaben]
  );

  const totalOpen = useMemo(() => aufgaben.filter(a => !a.fields.aufgabe_erledigt).length, [aufgaben]);
  const totalDone = useMemo(() => aufgaben.filter(a => !!a.fields.aufgabe_erledigt).length, [aufgaben]);
  const progressPercent = aufgaben.length > 0 ? Math.round((totalDone / aufgaben.length) * 100) : 0;

  async function handleMarkDone(a: Aufgaben) {
    await LivingAppsService.updateAufgabenEntry(a.record_id, { aufgabe_erledigt: true });
    setMarkedDone(prev => prev + 1);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteAufgabenEntry(deleteTarget.record_id);
    setDeleted(prev => prev + 1);
    setDeleteTarget(null);
    fetchAll();
  }

  const totalCleaned = markedDone + deleted + rescheduled;

  return (
    <IntentWizardShell
      title="Aufgaben überprüfen"
      subtitle="Bereinige überfällige Aufgaben und behalte den Überblick."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Überblick */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Aktueller Stand</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hier siehst du, wo deine Aufgaben gerade stehen.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-2xl border p-5 overflow-hidden ${overdueOpen.length > 0 ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overdueOpen.length > 0 ? 'bg-red-100' : 'bg-muted'}`}>
                  <IconAlertTriangle size={20} className={overdueOpen.length > 0 ? 'text-red-600' : 'text-muted-foreground'} stroke={2} />
                </div>
                <span className={`text-3xl font-bold ${overdueOpen.length > 0 ? 'text-red-700' : 'text-foreground'}`}>
                  {overdueOpen.length}
                </span>
              </div>
              <div className="font-semibold text-sm">Überfällig</div>
              <div className="text-xs text-muted-foreground mt-0.5">Frist bereits überschritten</div>
            </div>

            <div className={`rounded-2xl border p-5 overflow-hidden ${noDateOpen.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-card'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${noDateOpen.length > 0 ? 'bg-amber-100' : 'bg-muted'}`}>
                  <IconCalendarOff size={20} className={noDateOpen.length > 0 ? 'text-amber-600' : 'text-muted-foreground'} stroke={2} />
                </div>
                <span className={`text-3xl font-bold ${noDateOpen.length > 0 ? 'text-amber-700' : 'text-foreground'}`}>
                  {noDateOpen.length}
                </span>
              </div>
              <div className="font-semibold text-sm">Ohne Termin</div>
              <div className="text-xs text-muted-foreground mt-0.5">Kein Fälligkeitsdatum gesetzt</div>
            </div>

            <div className="rounded-2xl border bg-card p-5 overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <IconCircleCheck size={20} className="text-green-600" stroke={2} />
                </div>
                <span className="text-3xl font-bold text-foreground">{progressPercent}%</span>
              </div>
              <div className="font-semibold text-sm">Fortschritt</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {totalDone} von {aufgaben.length} erledigt
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl border bg-card p-4 space-y-2 overflow-hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Gesamtfortschritt</span>
              <span className="font-semibold">{totalDone} / {aufgaben.length}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalOpen} offen</span>
              <span>{totalDone} erledigt</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {overdueOpen.length > 0 ? (
              <Button onClick={() => setCurrentStep(2)} className="gap-1.5">
                <IconClockExclamation size={16} stroke={2} />
                {overdueOpen.length} überfällige bereinigen
                <IconArrowRight size={15} stroke={2} />
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep(3)} variant="outline" className="gap-1.5">
                <IconCheck size={16} stroke={2} />
                Alles up-to-date – weiter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Bereinigen */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Überfällige Aufgaben</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {overdueOpen.length === 0
                  ? 'Alle überfälligen Aufgaben wurden bereinigt!'
                  : `${overdueOpen.length} Aufgabe${overdueOpen.length !== 1 ? 'n' : ''} mit überschrittener Frist`}
              </p>
            </div>
            {overdueOpen.length === 0 && (
              <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 text-sm font-medium">
                <IconCheck size={16} stroke={2.5} />
                Alles bereinigt
              </div>
            )}
          </div>

          {overdueOpen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-2xl border bg-card">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                <IconCheck size={28} className="text-green-600" stroke={2.5} />
              </div>
              <div>
                <div className="font-semibold text-foreground">Keine überfälligen Aufgaben</div>
                <div className="text-sm text-muted-foreground mt-1">Super — keine Aufgaben mit überschrittener Frist.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueOpen.map(task => {
                const prio = task.fields.aufgabe_prioritaet;
                return (
                  <div key={task.record_id} className="rounded-2xl border border-red-200 bg-card p-4 overflow-hidden">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {task.fields.aufgabe_titel ?? '(Kein Titel)'}
                        </div>
                        {task.fields.aufgabe_beschreibung && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {task.fields.aufgabe_beschreibung}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            Überfällig: {formatDate(task.fields.aufgabe_faelligkeit ?? '')}
                          </span>
                          {prio && (
                            <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${PRIO_COLORS[prio.key] ?? 'bg-muted text-muted-foreground border-border'}`}>
                              {prio.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleMarkDone(task)}
                      >
                        <IconCheck size={14} stroke={2.5} />
                        Erledigt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setEditTarget(task)}
                      >
                        <IconPencil size={14} />
                        Neu terminieren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                        onClick={() => setDeleteTarget(task)}
                      >
                        <IconTrash size={14} />
                        Löschen
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-1.5">
              <IconArrowLeft size={15} stroke={2} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="gap-1.5">
              Abschließen
              <IconArrowRight size={15} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Fertig */}
      {currentStep === 3 && (
        <div className="space-y-8">
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <IconTrophy size={40} className="text-primary" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Review abgeschlossen!</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                {totalCleaned > 0
                  ? `Du hast ${totalCleaned} Aufgabe${totalCleaned !== 1 ? 'n' : ''} bereinigt.`
                  : 'Deine Aufgaben sind bereits in einem guten Zustand.'}
              </p>
            </div>

            {totalCleaned > 0 && (
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
                {markedDone > 0 && (
                  <div className="rounded-2xl border bg-green-50 border-green-200 p-3 text-center overflow-hidden">
                    <div className="text-2xl font-bold text-green-700">{markedDone}</div>
                    <div className="text-xs text-green-600 mt-0.5">Erledigt</div>
                  </div>
                )}
                {rescheduled > 0 && (
                  <div className="rounded-2xl border bg-blue-50 border-blue-200 p-3 text-center overflow-hidden">
                    <div className="text-2xl font-bold text-blue-700">{rescheduled}</div>
                    <div className="text-xs text-blue-600 mt-0.5">Terminiert</div>
                  </div>
                )}
                {deleted > 0 && (
                  <div className="rounded-2xl border bg-card p-3 text-center overflow-hidden">
                    <div className="text-2xl font-bold text-foreground">{deleted}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Gelöscht</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalOpen}</div>
                <div className="text-xs text-muted-foreground">Noch offen</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalDone}</div>
                <div className="text-xs text-muted-foreground">Erledigt</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => { setCurrentStep(1); setMarkedDone(0); setDeleted(0); setRescheduled(0); }}>
              <IconArrowLeft size={16} className="mr-1.5" stroke={2} />
              Nochmal überprüfen
            </Button>
            <Button asChild>
              <a href="#/">
                <IconCheck size={16} className="mr-1.5" stroke={2} />
                Zurück zum Dashboard
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog (Neu terminieren) */}
      {editTarget && (
        <AufgabenDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (fields) => {
            await LivingAppsService.updateAufgabenEntry(editTarget.record_id, fields);
            setRescheduled(prev => prev + 1);
            setEditTarget(null);
            fetchAll();
          }}
          defaultValues={editTarget.fields}
          kategorienList={kategorien}
          enablePhotoScan={false}
          enablePhotoLocation={false}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Aufgabe löschen"
        description={`Soll "${deleteTarget?.fields.aufgabe_titel ?? 'diese Aufgabe'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </IntentWizardShell>
  );
}
