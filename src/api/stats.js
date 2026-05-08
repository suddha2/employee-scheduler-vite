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
