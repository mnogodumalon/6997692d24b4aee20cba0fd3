import type { Aufgaben, Kategorien } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AufgabenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Aufgaben | null;
  onEdit: (record: Aufgaben) => void;
  kategorienList: Kategorien[];
}

export function AufgabenViewDialog({ open, onClose, record, onEdit, kategorienList }: AufgabenViewDialogProps) {
  function getKategorienDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kategorienList.find(r => r.record_id === id)?.fields.kategorie_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aufgaben anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel</Label>
            <p className="text-sm">{record.fields.aufgabe_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.aufgabe_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fälligkeitsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.aufgabe_faelligkeit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <Badge variant="secondary">{record.fields.aufgabe_prioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <p className="text-sm">{getKategorienDisplayName(record.fields.aufgabe_kategorie)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erledigt</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.aufgabe_erledigt ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.aufgabe_erledigt ? 'Ja' : 'Nein'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}