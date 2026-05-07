import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from './endpoint';

// All endpoints flow through axiosInstance, which attaches the bearer
// token via interceptor — call sites do not need to set Authorization.

export async function fetchCurrentSchedule(id) {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.solvedSchedule}?id=${id}`);
  return data;
}

export async function fetchScheduleVersion(id, versionId, highlightChanges) {
  const { data } = await axiosInstance.get(
    `${API_ENDPOINTS.scheduleVersions}/${id}/versions/${versionId}`,
    { params: { highlightChanges } }
  );
  return data; // shape: { version, ...rotaPayload }
}

// Best-effort fetch of the "current" version metadata. Returns null on
// failure so callers can render without it.
export async function fetchCurrentVersionMeta(id) {
  try {
    const { data } = await axiosInstance.get(
      `${API_ENDPOINTS.scheduleVersions}/${id}/versions/current`
    );
    return data.version;
  } catch {
    return null;
  }
}
