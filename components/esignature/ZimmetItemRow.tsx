'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export interface ZimmetItemData {
  id?: string;
  category: string;
  name: string;
  quantity: number;
  condition: string;
  note: string;
}

interface ZimmetItemRowProps {
  item: ZimmetItemData;
  index: number;
  onChange: (index: number, field: keyof ZimmetItemData, value: string | number) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

const CATEGORIES = [
  { value: 'EKIPMAN', label: 'Ekipman' },
  { value: 'UNIFORM', label: 'Üniform' },
  { value: 'ANAHTAR', label: 'Anahtar' },
  { value: 'DIGER', label: 'Diğer' },
];

const CONDITIONS = [
  { value: 'IYI', label: 'İyi' },
  { value: 'KULLANILMIS', label: 'Kullanılmış' },
  { value: 'HASARLI', label: 'Hasarlı' },
];

export default function ZimmetItemRow({
  item,
  index,
  onChange,
  onRemove,
  readOnly = false,
}: ZimmetItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
      <div className="col-span-3">
        <Select value={item.category} onValueChange={(v) => onChange(index, 'category', v)} disabled={readOnly}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3">
        <Input placeholder="Kalem adı" value={item.name} onChange={(e) => onChange(index, 'name', e.target.value)} disabled={readOnly} className="h-9" />
      </div>
      <div className="col-span-1">
        <Input type="number" min={1} value={item.quantity} onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value) || 1)} disabled={readOnly} className="h-9" />
      </div>
      <div className="col-span-2">
        <Select value={item.condition} onValueChange={(v) => onChange(index, 'condition', v)} disabled={readOnly}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Input placeholder="Not (opsiyonel)" value={item.note} onChange={(e) => onChange(index, 'note', e.target.value)} disabled={readOnly} className="h-9" />
      </div>
      {!readOnly && (
        <div className="col-span-1 flex justify-center">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
