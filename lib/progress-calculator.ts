import { prisma } from '@/lib/db';

/**
 * Alt hedefin ilerlemesini hesaplar
 * Aksiyonların ortalamasını alır (aksiyonlar eşit ağırlıklı)
 */
export async function calculateSubGoalProgress(subGoalId: string): Promise<number> {
  const subGoal = await prisma.strategicSubGoal.findUnique({
    where: { id: subGoalId },
    include: {
      actions: {
        where: { isActive: true },
        select: { id: true, progress: true },
      },
    },
  });

  if (!subGoal) return 0;

  const actions = subGoal.actions;
  
  if (actions.length === 0) {
    // Aksiyon yoksa, currentValue/targetValue oranına bak
    if (subGoal.targetValue && subGoal.targetValue > 0) {
      const current = subGoal.currentValue || 0;
      return Math.min(100, Math.round((current / subGoal.targetValue) * 100));
    }
    return 0;
  }

  // Aksiyonların ortalamasını hesapla (eşit ağırlık)
  const totalProgress = actions.reduce((sum, action) => sum + (action.progress || 0), 0);
  
  return Math.round(totalProgress / actions.length);
}

/**
 * Hedefin ilerlemesini hesaplar
 * Alt hedeflerin (ağırlıklı) ve doğrudan bağlı aksiyonların ortalamasını alır
 */
export async function calculateGoalProgress(goalId: string): Promise<number> {
  const goal = await prisma.strategicGoal.findUnique({
    where: { id: goalId },
    include: {
      subGoals: {
        where: { isActive: true },
        select: { id: true, progress: true, weight: true, targetValue: true, currentValue: true },
      },
      actions: {
        where: { isActive: true },
        select: { id: true, progress: true },
      },
    },
  });

  if (!goal) return 0;

  const items: { progress: number; weight: number }[] = [];

  // Alt hedefleri ekle (ağırlıkları ile)
  for (const subGoal of goal.subGoals) {
    items.push({ 
      progress: subGoal.progress || 0, 
      weight: subGoal.weight || 1 
    });
  }

  // Doğrudan bağlı aksiyonları ekle (eşit ağırlık = 1)
  goal.actions.forEach((action) => {
    items.push({ progress: action.progress || 0, weight: 1 });
  });

  if (items.length === 0) {
    // Hiç alt hedef veya aksiyon yoksa, currentValue/targetValue oranına bak
    if (goal.targetValue && goal.targetValue > 0) {
      const current = goal.currentValue || 0;
      return Math.min(100, Math.round((current / goal.targetValue) * 100));
    }
    return 0;
  }

  // Ağırlıklı ortalama hesapla
  let totalWeight = 0;
  let weightedProgress = 0;

  items.forEach(item => {
    totalWeight += item.weight;
    weightedProgress += item.progress * item.weight;
  });

  if (totalWeight === 0) return 0;

  return Math.round(weightedProgress / totalWeight);
}

/**
 * Alt hedef ilerlemesini hesapla ve kaydet
 */
export async function updateSubGoalProgress(subGoalId: string): Promise<number> {
  const progress = await calculateSubGoalProgress(subGoalId);
  
  await prisma.strategicSubGoal.update({
    where: { id: subGoalId },
    data: { progress },
  });

  // Üst hedefin ilerlemesini de güncelle
  const subGoal = await prisma.strategicSubGoal.findUnique({
    where: { id: subGoalId },
    select: { goalId: true },
  });

  if (subGoal?.goalId) {
    await updateGoalProgress(subGoal.goalId);
  }

  return progress;
}

/**
 * Hedef ilerlemesini hesapla ve kaydet
 */
export async function updateGoalProgress(goalId: string): Promise<number> {
  const progress = await calculateGoalProgress(goalId);
  
  await prisma.strategicGoal.update({
    where: { id: goalId },
    data: { progress },
  });

  return progress;
}

/**
 * Bir dönemdeki tüm hedeflerin ilerlemesini hesapla ve kaydet
 */
export async function recalculateAllProgressForPeriod(periodId: string): Promise<void> {
  // Dönemdeki tüm hedefleri bul
  const objectives = await prisma.strategicObjective.findMany({
    where: { periodId, isActive: true },
    include: {
      goals: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  for (const objective of objectives) {
    for (const goal of objective.goals) {
      // Önce alt hedeflerin ilerlemesini hesapla
      const subGoals = await prisma.strategicSubGoal.findMany({
        where: { goalId: goal.id, isActive: true },
        select: { id: true },
      });

      for (const subGoal of subGoals) {
        await updateSubGoalProgress(subGoal.id);
      }

      // Sonra hedefin ilerlemesini hesapla
      await updateGoalProgress(goal.id);
    }
  }
}

/**
 * Aksiyon güncellendiğinde ilgili hedeflerin ilerlemesini güncelle
 */
export async function updateProgressAfterActionChange(actionId: string): Promise<void> {
  const action = await prisma.strategicAction.findUnique({
    where: { id: actionId },
    select: { goalId: true, subGoalId: true },
  });

  if (!action) return;

  if (action.subGoalId) {
    await updateSubGoalProgress(action.subGoalId);
  } else if (action.goalId) {
    await updateGoalProgress(action.goalId);
  }
}
