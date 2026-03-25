'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Plus } from 'lucide-react';

export default function InnovationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">İnovasyon Yönetimi</h2>
          <p className="text-muted-foreground">İnovasyon fikirleri ve projeleri yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Lightbulb className="h-12 w-12 text-yellow-500 mb-4" />
            <CardTitle className="text-lg mb-2">İnovasyon Fikirleri</CardTitle>
            <CardDescription>
              Yeni fikirler oluşturun, değerlendirin ve takip edin
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
