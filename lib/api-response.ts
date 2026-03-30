import { NextResponse } from 'next/server';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiSuccessPaginated<T>(
  data: T,
  meta: PaginationMeta
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data, meta });
}

export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function apiError(
  message: string,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiUnauthorized(
  message = 'Oturum açmanız gerekiyor'
): NextResponse<ApiErrorResponse> {
  return apiError(message, 401);
}

export function apiForbidden(
  message = 'Bu işlem için yetkiniz yok'
): NextResponse<ApiErrorResponse> {
  return apiError(message, 403);
}

export function apiNotFound(
  message = 'Kayıt bulunamadı'
): NextResponse<ApiErrorResponse> {
  return apiError(message, 404);
}

export function apiServerError(
  message = 'Sunucu hatası oluştu'
): NextResponse<ApiErrorResponse> {
  return apiError(message, 500);
}

export function apiTooManyRequests(
  message = 'Çok fazla istek gönderildi. Lütfen bekleyin.'
): NextResponse<ApiErrorResponse> {
  return apiError(message, 429);
}
