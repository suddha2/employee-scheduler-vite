import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from './endpoint';

// All endpoints flow through axiosInstance, which attaches the bearer
// token via interceptor — call sites do not need to set Authorization.

// status: omit (or pass falsy) to return all statuses; defaults to PENDING.
// rotaId: omit to fetch across all rotas.
export async function listShiftRequests(rotaId, status = 'PENDING') {
  const params = {};
  if (rotaId != null) params.rotaId = rotaId;
  if (status) params.status = status;
  const { data } = await axiosInstance.get(API_ENDPOINTS.shiftRequests, { params });
  return data;
}

export async function resolveShiftRequest(id, action) {
  const { data } = await axiosInstance.put(
    API_ENDPOINTS.shiftRequestResolve(id),
    { action }
  );
  return data;
}
