'use client';

import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';

export default function InnovationProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">İnovasyon Projeleri</h2>
          <p className="text-muted-foreground">İnovasyon projelerini yönetin ve takip edin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <FolderKanban className="h-12 w-12 text-blue-500 mb-4" />
            <CardTitle className="text-lg mb-2">Projeler</CardTitle>
            <CardDescription>
              İnovasyon projelerinizi oluşturun ve yönetin
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-4">
              Bu modül yakında aktif olacaktır.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
