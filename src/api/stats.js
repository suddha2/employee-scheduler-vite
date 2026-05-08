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
