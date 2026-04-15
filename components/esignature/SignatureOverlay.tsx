'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignatureCanvas from './SignatureCanvas';

interface SignatureOverlayProps {
  title: string;
  summary: React.ReactNode;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function SignatureOverlay({
  title,
  summary,
  onSave,
  onClose,
  loading = false,
}: SignatureOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Lütfen aşağıdaki özeti okuyun ve imzanızı çizin
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-6 bg-gray-50 border-b">
          {summary}
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">İmzanız</p>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              İmza işleniyor...
            </div>
          ) : (
            <SignatureCanvas onSave={onSave} width={700} height={180} />
          )}
        </div>
      </div>
    </div>
  );
}
