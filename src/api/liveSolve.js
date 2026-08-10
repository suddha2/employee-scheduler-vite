// Thin wrappers over the live/continuous-solving endpoints (P4).
// axiosInstance injects the Bearer token and base URL.
import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from './endpoint';

export const liveSolveApi = {
  start: (rotaId) => axiosInstance.post(API_ENDPOINTS.liveStart(rotaId)).then((r) => r.data),
  stop: (rotaId) => axiosInstance.post(API_ENDPOINTS.liveStop(rotaId)).then((r) => r.data),
  snapshot: (rotaId) => axiosInstance.post(API_ENDPOINTS.liveSnapshot(rotaId)).then((r) => r.data),
  status: (rotaId) => axiosInstance.get(API_ENDPOINTS.liveStatus(rotaId)).then((r) => r.data),

  // Live edits — fed to the running solver as ProblemChanges.
  assign: (rotaId, assignmentId, employeeId, pin = true) =>
    axiosInstance
      .post(API_ENDPOINTS.liveAssign(rotaId), { assignmentId, employeeId, pin })
      .then((r) => r.data),
  pin: (rotaId, assignmentId, pinned) =>
    axiosInstance.post(API_ENDPOINTS.livePin(rotaId), { assignmentId, pinned }).then((r) => r.data),

  // Structural edits — adjust the live value range (carer pool).
  addEmployee: (rotaId, employeeId) =>
    axiosInstance.post(API_ENDPOINTS.liveEmployeeAdd(rotaId), { employeeId }).then((r) => r.data),
  removeEmployee: (rotaId, employeeId) =>
    axiosInstance.post(API_ENDPOINTS.liveEmployeeRemove(rotaId), { employeeId }).then((r) => r.data),
};

export default liveSolveApi;
