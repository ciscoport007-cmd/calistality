import { prisma } from './db';
import { headers } from 'next/headers';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'STATUS_CHANGE' 
  | 'LOGIN' 
  | 'LOGOUT'
  // Document Lock
  | 'CHECK_IN'
  | 'CHECK_OUT'
  // Document Review (Planned)
  | 'REVIEW_SCHEDULE_UPDATE'
  | 'REVIEW_COMPLETED'
  // Document Acknowledgment
  | 'ACKNOWLEDGMENT_REQUIRED'
  | 'DOCUMENT_ACKNOWLEDGED'
  | 'DOCUMENT_ACKNOWLEDGMENT_REJECTED'
  // Phase 2 - Document Cancellation
  | 'DOCUMENT_CANCELLED'
  | 'DOCUMENT_CANCEL_REVERTED'
  // Phase 2 - Document Review (Pre-approval)
  | 'DOCUMENT_SENT_FOR_REVIEW'
  | 'DOCUMENT_REVIEW_APPROVED'
  | 'DOCUMENT_REVIEW_REJECTED';

export type AuditModule = 
  | 'USERS'
  | 'ROLES'
  | 'DEPARTMENTS'
  | 'DOCUMENTS'
  | 'DOKUMAN'
  | 'COMPLAINTS'
  | 'CAPAS'
  | 'AUDITS'
  | 'RISKS'
  | 'EQUIPMENT'
  | 'SUPPLIERS'
  | 'TRAININGS'
  | 'KPIS'
  | 'STRATEGY'
  | 'SWOT'
  | 'PESTEL'
  | 'AUTH';

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  module: AuditModule;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  description?: string;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Audit log hatası ana işlemi engellememeli
    console.error('Audit log error:', error);
  }
}

/**
 * Compares two objects and returns only the changed fields
 */
export function getChangedFields(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): { oldValues: Record<string, any>; newValues: Record<string, any> } {
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  // Exclude fields that shouldn't be logged
  const excludeFields = ['password', 'updatedAt', 'createdAt'];

  for (const key of Object.keys(newObj)) {
    if (excludeFields.includes(key)) continue;
    
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // Compare values (handle dates)
    const oldStr = oldVal instanceof Date ? oldVal.toISOString() : JSON.stringify(oldVal);
    const newStr = newVal instanceof Date ? newVal.toISOString() : JSON.stringify(newVal);

    if (oldStr !== newStr) {
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  }

  return { oldValues, newValues };
}

/**
 * Helper function to check if user has admin role or strategy office role
 * Admin, Yönetici, Strateji Ofisi roles can see all data
 */
export function isAdmin(role?: string): boolean {
  if (!role) return false;
  const adminRoles = ['Admin', 'Yönetici', 'admin', 'Strateji Ofisi', 'strateji ofisi'];
  return adminRoles.some(r => role.toLowerCase() === r.toLowerCase());
}

/**
 * Helper function to check if user can create new content
 * Only Admin and Yönetici roles can create new content
 */
export function canCreate(role?: string): boolean {
  if (!role) return false;
  const createRoles = ['Admin', 'Yönetici', 'admin', 'yönetici'];
  return createRoles.some(r => role.toLowerCase() === r.toLowerCase());
}

/**
 * Helper function to check if user is department manager
 */
export function isDepartmentManager(role?: string): boolean {
  if (!role) return false;
  const managerRoles = ['Departman Müdürü', 'departman müdürü', 'Birim Sorumlusu', 'birim sorumlusu'];
  return managerRoles.some(r => role.toLowerCase() === r.toLowerCase());
}

/**
 * Helper function to check if user has strictly Admin role (not Yönetici)
 * Only Admin role can perform certain sensitive operations like document locking
 */
export function isStrictAdmin(role?: string): boolean {
  if (!role) return false;
  return role.toLowerCase() === 'admin';
}

/**
 * Helper function to check if user can access department data
 */
export function canAccessDepartment(
  userDepartmentId: string | undefined | null,
  targetDepartmentId: string | undefined | null,
  userRole?: string
): boolean {
  // Admin can access all departments
  if (isAdmin(userRole)) return true;
  
  // If target has no department, allow access
  if (!targetDepartmentId) return true;
  
  // If user has no department, deny access to department-specific data
  if (!userDepartmentId) return false;
  
  // Check if same department
  return userDepartmentId === targetDepartmentId;
}

/**
 * Get department filter for Prisma queries
 */
export function getDepartmentFilter(
  userDepartmentId: string | undefined | null,
  userRole?: string
): { departmentId?: string } | {} {
  // Admin sees all data
  if (isAdmin(userRole)) return {};
  
  // If user has department, filter by it
  if (userDepartmentId) {
    return { departmentId: userDepartmentId };
  }
  
  // No filter if no department
  return {};
}

/**
 * Get department filter for OR conditions (includes null departmentId)
 */
export function getDepartmentFilterWithNull(
  userDepartmentId: string | undefined | null,
  userRole?: string
): { OR?: any[] } | {} {
  // Admin sees all data
  if (isAdmin(userRole)) return {};
  
  // If user has department, filter by it or null
  if (userDepartmentId) {
    return {
      OR: [
        { departmentId: userDepartmentId },
        { departmentId: null },
      ],
    };
  }
  
  // No filter if no department
  return {};
}
