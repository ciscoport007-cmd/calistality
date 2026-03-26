import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const expenses = await prisma.supplierExpense.findMany({
      where: { supplierId: params.id },
      orderBy: { date: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } }
      }
    });

    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({ expenses, totalExpense });
  } catch (error) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json(
      { error: 'Harcamalar alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const { date, amount, currency, description, invoiceNo } = body;

    if (!date || !amount) {
      return NextResponse.json(
        { error: 'Tarih ve tutar zorunludur' },
        { status: 400 }
      );
    }

    const expense = await prisma.supplierExpense.create({
      data: {
        supplierId: params.id,
        date: new Date(date),
        amount: parseFloat(amount),
        currency: currency || 'TRY',
        description,
        invoiceNo,
        createdById: session.user.id
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } }
      }
    });

    // Tedarikçinin toplam sipariş tutarını güncelle
    const totalExpenses = await prisma.supplierExpense.aggregate({
      where: { supplierId: params.id },
      _sum: { amount: true }
    });

    await prisma.supplier.update({
      where: { id: params.id },
      data: {
        totalOrderAmount: totalExpenses._sum.amount || 0,
        lastOrderDate: new Date(date)
      }
    });

    // History kaydı
    await prisma.supplierHistory.create({
      data: {
        supplierId: params.id,
        userId: session.user.id,
        action: 'HARCAMA_EKLENDI',
        newValue: JSON.stringify({ amount, date, invoiceNo }),
        comments: `${amount} ${currency || 'TRY'} tutarında harcama eklendi`
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Expense create error:', error);
    return NextResponse.json(
      { error: 'Harcama eklenemedi' },
      { status: 500 }
    );
  }
}
