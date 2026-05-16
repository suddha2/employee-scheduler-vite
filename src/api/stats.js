import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from './endpoint';

// All endpoints flow through axiosInstance, which attaches the bearer
// token via interceptor — call sites do not need to set Authorization.

export async function fetchServiceStats(rotaId, { signal } = {}) {
  const { data } = await axiosInstance.get(API_ENDPOINTS.serviceStats, {
    params: { id: rotaId },
    signal,
  });
  return data;
}

// Broadcasts a "shifts available" FCM push for every unallocated shift in
// the rota. Returns PublishResultDTO; broadcastSent=false means no shifts
// were unallocated (info, not an error).
export async function publishUnallocatedShifts(rotaId) {
  const { data } = await axiosInstance.post(API_ENDPOINTS.publishUnallocated(rotaId));
  return data;
}

// Same as publishUnallocatedShifts but scoped to one service location.
// `service` is the service/location name as it appears on the shift template
// (it gets URL-encoded by the endpoint helper).
export async function publishUnallocatedShiftsForService(rotaId, service) {
  const { data } = await axiosInstance.post(
    API_ENDPOINTS.publishUnallocatedForService(rotaId, service)
  );
  return data;
}

// Normalise a PublishHistoryDTO payload to { publishCount, lastPublishedAt }
// regardless of field-name drift between endpoints (totalPublishCount vs
// publishCount; lastPublishedAt vs publishedAt).
export function normalizePublishHistory(raw) {
  if (!raw) return null;
  const publishCount = raw.publishCount
    ?? raw.totalPublishCount
    ?? raw.count
    ?? 0;
  const lastPublishedAt = raw.lastPublishedAt
    ?? raw.publishedAt
    ?? raw.lastAt
    ?? null;
  if (publishCount === 0 && !lastPublishedAt) return null;
  return { publishCount, lastPublishedAt };
}

// GET aggregate publish history for one service in a rota.
// Returns normalized { publishCount, lastPublishedAt } or null when there
// has been no publish (backend may 404 in that case -- swallow it).
export async function fetchServicePublishHistory(rotaId, service, { signal } = {}) {
  try {
    const { data } = await axiosInstance.get(
      API_ENDPOINTS.publishUnallocatedForService(rotaId, service),
      { signal }
    );
    return normalizePublishHistory(data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return null;
    throw err;
  }
}

// GET the full publish audit trail (most recent 50 events) for one service.
// Called lazily — only when the history drawer is opened — so the stats
// screen's normal render stays cheap.
export async function fetchServicePublishLog(rotaId, service, { signal } = {}) {
  const { data } = await axiosInstance.get(
    API_ENDPOINTS.publishLogForService(rotaId, service),
    { signal }
  );
  return Array.isArray(data) ? data : [];
}

// GET aggregate publish history for the rota-level "publish all" action.
export async function fetchRotaPublishHistory(rotaId, { signal } = {}) {
  try {
    const { data } = await axiosInstance.get(
      API_ENDPOINTS.publishUnallocated(rotaId),
      { signal }
    );
    return normalizePublishHistory(data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return null;
    throw err;
  }
}
