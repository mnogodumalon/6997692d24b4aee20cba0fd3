import { useState, useEffect, useMemo } from 'react';
import type { Aufgaben, Kategorien } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import {
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Settings,
  ListTodo,
} from 'lucide-react';

// Priority configuration
const PRIORITY_CONFIG = {
  sehr_hoch: { label: 'Sehr hoch', color: 'hsl(0 70% 50%)', order: 0 },
  hoch: { label: 'Hoch', color: 'hsl(25 90% 50%)', order: 1 },
  mittel: { label: 'Mittel', color: 'hsl(45 90% 50%)', order: 2 },
  niedrig: { label: 'Niedrig', color: 'hsl(175 50% 35%)', order: 3 },
} as const;

// Category color configuration
const CATEGORY_COLORS = {
  rot: 'hsl(0 70% 50%)',
  blau: 'hsl(210 70% 50%)',
  gruen: 'hsl(140 60% 40%)',
  orange: 'hsl(25 90% 50%)',
  lila: 'hsl(280 60% 50%)',
  grau: 'hsl(0 0% 50%)',
  gelb: 'hsl(45 90% 50%)',
} as const;

type PriorityKey = keyof typeof PRIORITY_CONFIG;
type CategoryColorKey = keyof typeof CATEGORY_COLORS;

// Progress Ring Component
function ProgressRing({ progress, size = 80, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        className="text-muted"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-primary transition-all duration-500"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
}

// Loading skeleton
function LoadingState() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ onAddTask }: { onAddTask: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <ListTodo className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Keine Aufgaben vorhanden</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Erstelle deine erste Aufgabe, um loszulegen.
      </p>
      <Button onClick={onAddTask}>
        <Plus className="h-4 w-4 mr-2" />
        Erste Aufgabe erstellen
      </Button>
    </div>
  );
}

// Task Dialog (Create/Edit)
interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Aufgaben | null;
  kategorien: Kategorien[];
  onSuccess: () => void;
}

function TaskDialog({ open, onOpenChange, task, kategorien, onSuccess }: TaskDialogProps) {
  const isEditing = !!task;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    aufgabe_titel: '',
    aufgabe_beschreibung: '',
    aufgabe_faelligkeit: '',
    aufgabe_prioritaet: 'mittel' as PriorityKey,
    aufgabe_kategorie: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        aufgabe_titel: task?.fields.aufgabe_titel ?? '',
        aufgabe_beschreibung: task?.fields.aufgabe_beschreibung ?? '',
        aufgabe_faelligkeit: task?.fields.aufgabe_faelligkeit?.split('T')[0] ?? '',
        aufgabe_prioritaet: (task?.fields.aufgabe_prioritaet ?? 'mittel') as PriorityKey,
        aufgabe_kategorie: task?.fields.aufgabe_kategorie ? extractRecordId(task.fields.aufgabe_kategorie) ?? '' : '',
      });
    }
  }, [open, task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.aufgabe_titel.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }

    setSubmitting(true);
    try {
      const apiData = {
        aufgabe_titel: formData.aufgabe_titel.trim(),
        aufgabe_beschreibung: formData.aufgabe_beschreibung.trim() || undefined,
        aufgabe_faelligkeit: formData.aufgabe_faelligkeit || undefined,
        aufgabe_prioritaet: formData.aufgabe_prioritaet,
        aufgabe_kategorie: formData.aufgabe_kategorie
          ? createRecordUrl(APP_IDS.KATEGORIEN, formData.aufgabe_kategorie)
          : undefined,
        aufgabe_erledigt: task?.fields.aufgabe_erledigt ?? false,
      };

      if (isEditing && task) {
        await LivingAppsService.updateAufgabenEntry(task.record_id, apiData);
        toast.success('Aufgabe gespeichert');
      } else {
        await LivingAppsService.createAufgabenEntry(apiData);
        toast.success('Aufgabe erstellt');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titel">Titel *</Label>
            <Input
              id="titel"
              value={formData.aufgabe_titel}
              onChange={(e) => setFormData((prev) => ({ ...prev, aufgabe_titel: e.target.value }))}
              placeholder="Was ist zu tun?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.aufgabe_beschreibung}
              onChange={(e) => setFormData((prev) => ({ ...prev, aufgabe_beschreibung: e.target.value }))}
              placeholder="Weitere Details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faelligkeit">Fälligkeitsdatum</Label>
              <Input
                id="faelligkeit"
                type="date"
                value={formData.aufgabe_faelligkeit}
                onChange={(e) => setFormData((prev) => ({ ...prev, aufgabe_faelligkeit: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioritaet">Priorität</Label>
              <Select
                value={formData.aufgabe_prioritaet}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, aufgabe_prioritaet: value as PriorityKey }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie</Label>
            <Select
              value={formData.aufgabe_kategorie || 'keine'}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, aufgabe_kategorie: value === 'keine' ? '' : value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keine">Keine Kategorie</SelectItem>
                {kategorien.map((kat) => (
                  <SelectItem key={kat.record_id} value={kat.record_id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[kat.fields.kategorie_farbe as CategoryColorKey] ?? CATEGORY_COLORS.grau }}
                      />
                      {kat.fields.kategorie_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : isEditing ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Category Dialog (Create/Edit)
interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Kategorien | null;
  onSuccess: () => void;
}

function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
  const isEditing = !!category;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    kategorie_name: '',
    kategorie_beschreibung: '',
    kategorie_farbe: 'blau' as CategoryColorKey,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        kategorie_name: category?.fields.kategorie_name ?? '',
        kategorie_beschreibung: category?.fields.kategorie_beschreibung ?? '',
        kategorie_farbe: (category?.fields.kategorie_farbe ?? 'blau') as CategoryColorKey,
      });
    }
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.kategorie_name.trim()) {
      toast.error('Bitte gib einen Namen ein');
      return;
    }

    setSubmitting(true);
    try {
      const apiData = {
        kategorie_name: formData.kategorie_name.trim(),
        kategorie_beschreibung: formData.kategorie_beschreibung.trim() || undefined,
        kategorie_farbe: formData.kategorie_farbe,
      };

      if (isEditing && category) {
        await LivingAppsService.updateKategorienEntry(category.record_id, apiData);
        toast.success('Kategorie gespeichert');
      } else {
        await LivingAppsService.createKategorienEntry(apiData);
        toast.success('Kategorie erstellt');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kat-name">Name *</Label>
            <Input
              id="kat-name"
              value={formData.kategorie_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, kategorie_name: e.target.value }))}
              placeholder="z.B. Arbeit, Privat..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kat-beschreibung">Beschreibung</Label>
            <Textarea
              id="kat-beschreibung"
              value={formData.kategorie_beschreibung}
              onChange={(e) => setFormData((prev) => ({ ...prev, kategorie_beschreibung: e.target.value }))}
              placeholder="Optional"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_COLORS) as [CategoryColorKey, string][]).map(([key, color]) => (
                <button
                  key={key}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.kategorie_farbe === key ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData((prev) => ({ ...prev, kategorie_farbe: key }))}
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : isEditing ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Category Management Dialog
interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kategorien: Kategorien[];
  taskCounts: Map<string, number>;
  onRefresh: () => void;
}

function CategoryManagementDialog({
  open,
  onOpenChange,
  kategorien,
  taskCounts,
  onRefresh,
}: CategoryManagementDialogProps) {
  const [editCategory, setEditCategory] = useState<Kategorien | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Kategorien | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteCategory) return;
    setDeleting(true);
    try {
      await LivingAppsService.deleteKategorienEntry(deleteCategory.record_id);
      toast.success('Kategorie gelöscht');
      setDeleteCategory(null);
      onRefresh();
    } catch (err) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kategorien verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {kategorien.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Keine Kategorien vorhanden</p>
            ) : (
              kategorien.map((kat) => (
                <div
                  key={kat.record_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[kat.fields.kategorie_farbe as CategoryColorKey] ?? CATEGORY_COLORS.grau }}
                    />
                    <div>
                      <div className="font-medium">{kat.fields.kategorie_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {taskCounts.get(kat.record_id) ?? 0} Aufgaben
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditCategory(kat)}
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteCategory(kat)}
                      aria-label="Löschen"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Kategorie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        open={showCreateDialog || !!editCategory}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditCategory(null);
          }
        }}
        category={editCategory}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategorie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Kategorie &quot;{deleteCategory?.fields.kategorie_name}&quot; wirklich löschen?
              Aufgaben mit dieser Kategorie verlieren ihre Zuordnung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Task Card Component
interface TaskCardProps {
  task: Aufgaben;
  kategorie?: Kategorien;
  onToggle: () => void;
  onClick: () => void;
}

function TaskCard({ task, kategorie, onToggle, onClick }: TaskCardProps) {
  const priority = task.fields.aufgabe_prioritaet as PriorityKey | undefined;
  const priorityColor = priority ? PRIORITY_CONFIG[priority]?.color : PRIORITY_CONFIG.mittel.color;
  const isCompleted = task.fields.aufgabe_erledigt;
  const dueDate = task.fields.aufgabe_faelligkeit;

  let dueBadge = null;
  if (dueDate && !isCompleted) {
    const date = parseISO(dueDate);
    const today = startOfDay(new Date());

    if (isBefore(date, today)) {
      dueBadge = (
        <Badge variant="destructive" className="text-xs">
          Überfällig
        </Badge>
      );
    } else if (isToday(date)) {
      dueBadge = (
        <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">
          Heute
        </Badge>
      );
    } else {
      dueBadge = (
        <Badge variant="secondary" className="text-xs">
          {format(date, 'dd.MM.', { locale: de })}
        </Badge>
      );
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer ${
        isCompleted ? 'opacity-60' : ''
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: priorityColor }}
      onClick={onClick}
    >
      <div
        className="pt-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <Checkbox
          checked={isCompleted}
          className="h-5 w-5"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {task.fields.aufgabe_titel}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {kategorie && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[kategorie.fields.kategorie_farbe as CategoryColorKey] ?? CATEGORY_COLORS.grau }}
              />
              {kategorie.fields.kategorie_name}
            </span>
          )}
          {dueBadge}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const [aufgaben, setAufgaben] = useState<Aufgaben[]>([]);
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Dialog states
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<Aufgaben | null>(null);
  const [deleteTask, setDeleteTask] = useState<Aufgaben | null>(null);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [selectedKategorie, setSelectedKategorie] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const [aufgabenData, kategorienData] = await Promise.all([
        LivingAppsService.getAufgaben(),
        LivingAppsService.getKategorien(),
      ]);
      setAufgaben(aufgabenData);
      setKategorien(kategorienData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Create kategorie lookup map
  const kategorieMap = useMemo(() => {
    const map = new Map<string, Kategorien>();
    kategorien.forEach((kat) => map.set(kat.record_id, kat));
    return map;
  }, [kategorien]);

  // Calculate task counts per category
  const taskCountsPerCategory = useMemo(() => {
    const counts = new Map<string, number>();
    aufgaben.forEach((task) => {
      if (!task.fields.aufgabe_erledigt) {
        const katId = extractRecordId(task.fields.aufgabe_kategorie);
        if (katId) {
          counts.set(katId, (counts.get(katId) ?? 0) + 1);
        }
      }
    });
    return counts;
  }, [aufgaben]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let tasks = aufgaben;

    // Filter by category
    if (selectedKategorie) {
      tasks = tasks.filter((task) => {
        const katId = extractRecordId(task.fields.aufgabe_kategorie);
        return katId === selectedKategorie;
      });
    }

    // Filter completed
    if (!showCompleted) {
      tasks = tasks.filter((task) => !task.fields.aufgabe_erledigt);
    }

    // Sort: Incomplete first, then by overdue, due date, priority
    return [...tasks].sort((a, b) => {
      // Completed at bottom
      if (a.fields.aufgabe_erledigt !== b.fields.aufgabe_erledigt) {
        return a.fields.aufgabe_erledigt ? 1 : -1;
      }

      const today = startOfDay(new Date());
      const dateA = a.fields.aufgabe_faelligkeit ? parseISO(a.fields.aufgabe_faelligkeit) : null;
      const dateB = b.fields.aufgabe_faelligkeit ? parseISO(b.fields.aufgabe_faelligkeit) : null;

      // Overdue first
      const aOverdue = dateA && isBefore(dateA, today);
      const bOverdue = dateB && isBefore(dateB, today);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      // Then by due date
      if (dateA && dateB) {
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) return dateDiff;
      } else if (dateA) return -1;
      else if (dateB) return 1;

      // Then by priority
      const prioA = PRIORITY_CONFIG[a.fields.aufgabe_prioritaet as PriorityKey]?.order ?? 99;
      const prioB = PRIORITY_CONFIG[b.fields.aufgabe_prioritaet as PriorityKey]?.order ?? 99;
      return prioA - prioB;
    });
  }, [aufgaben, selectedKategorie, showCompleted]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = startOfDay(new Date());
    const openTasks = aufgaben.filter((t) => !t.fields.aufgabe_erledigt);
    const completedTasks = aufgaben.filter((t) => t.fields.aufgabe_erledigt);

    const overdue = openTasks.filter((t) => {
      if (!t.fields.aufgabe_faelligkeit) return false;
      return isBefore(parseISO(t.fields.aufgabe_faelligkeit), today);
    });

    const dueToday = openTasks.filter((t) => {
      if (!t.fields.aufgabe_faelligkeit) return false;
      return isToday(parseISO(t.fields.aufgabe_faelligkeit));
    });

    const total = aufgaben.length;
    const completed = completedTasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      open: openTasks.length,
      completed,
      total,
      progress,
      overdue: overdue.length,
      dueToday: dueToday.length,
    };
  }, [aufgaben]);

  async function handleToggleTask(task: Aufgaben) {
    try {
      await LivingAppsService.updateAufgabenEntry(task.record_id, {
        aufgabe_erledigt: !task.fields.aufgabe_erledigt,
      });
      if (!task.fields.aufgabe_erledigt) {
        toast.success('Aufgabe erledigt!');
      }
      fetchData();
    } catch (err) {
      toast.error('Fehler beim Aktualisieren');
    }
  }

  async function handleDeleteTask() {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      await LivingAppsService.deleteAufgabenEntry(deleteTask.record_id);
      toast.success('Aufgabe gelöscht');
      setDeleteTask(null);
      fetchData();
    } catch (err) {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Fehler beim Laden</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={fetchData}>Erneut versuchen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Aufgaben</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManagement(true)}
              className="hidden sm:flex"
            >
              <Settings className="h-4 w-4 mr-2" />
              Kategorien
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditTask(null);
                setShowTaskDialog(true);
              }}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Aufgabe
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowCategoryManagement(true)}
              className="sm:hidden"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Card */}
            <Card className="shadow-sm">
              <CardContent className="pt-6 pb-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Offene Aufgaben</p>
                <div className="flex items-center justify-between">
                  <span className="text-5xl lg:text-4xl font-bold">{kpis.open}</span>
                  <div className="flex flex-col items-center">
                    <ProgressRing progress={kpis.progress} size={80} strokeWidth={8} />
                    <span className="text-sm text-muted-foreground mt-2">
                      {kpis.completed} von {kpis.total} erledigt
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Urgency Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                  kpis.overdue > 0 ? 'border-destructive/50' : ''
                }`}
                onClick={() => {
                  setSelectedKategorie(null);
                  setShowCompleted(false);
                }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${kpis.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className="text-sm text-muted-foreground">Überfällig</span>
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${kpis.overdue > 0 ? 'text-destructive' : ''}`}>
                    {kpis.overdue}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedKategorie(null)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Heute</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{kpis.dueToday}</p>
                </CardContent>
              </Card>
            </div>

            {/* Completed stats (desktop only) */}
            <Card className="shadow-sm hidden lg:block">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Erledigt</span>
                </div>
                <p className="text-2xl font-bold mt-1">{kpis.completed}</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Task List */}
          <div className="lg:col-span-3 space-y-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
              <button
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedKategorie === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => setSelectedKategorie(null)}
              >
                Alle
              </button>
              {kategorien.map((kat) => (
                <button
                  key={kat.record_id}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    selectedKategorie === kat.record_id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setSelectedKategorie(kat.record_id)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[kat.fields.kategorie_farbe as CategoryColorKey] ?? CATEGORY_COLORS.grau }}
                  />
                  {kat.fields.kategorie_name}
                  <span className="text-xs opacity-70">({taskCountsPerCategory.get(kat.record_id) ?? 0})</span>
                </button>
              ))}
            </div>

            {/* Show/Hide Completed Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredTasks.length} Aufgabe{filteredTasks.length !== 1 ? 'n' : ''}
              </span>
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? 'Erledigte ausblenden' : 'Erledigte anzeigen'}
              </button>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
              <EmptyState onAddTask={() => setShowTaskDialog(true)} />
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => {
                  const katId = extractRecordId(task.fields.aufgabe_kategorie);
                  const kategorie = katId ? kategorieMap.get(katId) : undefined;
                  return (
                    <TaskCard
                      key={task.record_id}
                      task={task}
                      kategorie={kategorie}
                      onToggle={() => handleToggleTask(task)}
                      onClick={() => setEditTask(task)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center sm:hidden"
        onClick={() => {
          setEditTask(null);
          setShowTaskDialog(true);
        }}
        aria-label="Neue Aufgabe"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Task Dialog */}
      <TaskDialog
        open={showTaskDialog || !!editTask}
        onOpenChange={(open) => {
          if (!open) {
            setShowTaskDialog(false);
            setEditTask(null);
          }
        }}
        task={editTask}
        kategorien={kategorien}
        onSuccess={fetchData}
      />

      {/* Task Detail Dialog with Delete */}
      {editTask && (
        <Dialog open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aufgabe Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Titel</Label>
                <p className="font-medium">{editTask.fields.aufgabe_titel}</p>
              </div>
              {editTask.fields.aufgabe_beschreibung && (
                <div>
                  <Label className="text-muted-foreground text-xs">Beschreibung</Label>
                  <p className="text-sm whitespace-pre-wrap">{editTask.fields.aufgabe_beschreibung}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {editTask.fields.aufgabe_faelligkeit && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Fällig</Label>
                    <p className="text-sm">
                      {format(parseISO(editTask.fields.aufgabe_faelligkeit), 'dd.MM.yyyy', { locale: de })}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Priorität</Label>
                  <p className="text-sm flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          PRIORITY_CONFIG[editTask.fields.aufgabe_prioritaet as PriorityKey]?.color ??
                          PRIORITY_CONFIG.mittel.color,
                      }}
                    />
                    {PRIORITY_CONFIG[editTask.fields.aufgabe_prioritaet as PriorityKey]?.label ?? 'Mittel'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <p className="text-sm">{editTask.fields.aufgabe_erledigt ? 'Erledigt' : 'Offen'}</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteTask(editTask);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
              <Button
                onClick={() => {
                  setShowTaskDialog(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Aufgabe &quot;{deleteTask?.fields.aufgabe_titel}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Management */}
      <CategoryManagementDialog
        open={showCategoryManagement}
        onOpenChange={setShowCategoryManagement}
        kategorien={kategorien}
        taskCounts={taskCountsPerCategory}
        onRefresh={fetchData}
      />
    </div>
  );
}
