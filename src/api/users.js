import axiosInstance from '../components/axiosInstance';
import { API_ENDPOINTS } from './endpoint';

export const ROLE_OPTIONS = ['ADMIN', 'OPS_MANAGER', 'ROTA_EDITOR', 'READ_ONLY'];

export const ROLE_LABELS = {
    ADMIN:       'Admin (full access)',
    OPS_MANAGER: 'Ops manager',
    ROTA_EDITOR: 'Rota editor',
    READ_ONLY:   'View only',
};

export async function listUsers() {
    const { data } = await axiosInstance.get(API_ENDPOINTS.adminUsers);
    return Array.isArray(data) ? data : [];
}

export async function createUser({ username, password, active = true, role }) {
    // Server accepts a list of roles; the UI assigns one role per user
    // (single-dropdown) which we wrap into a one-element list here.
    const body = { username, password, active, roles: [role] };
    const { data } = await axiosInstance.post(API_ENDPOINTS.adminUsers, body);
    return data;
}

export async function updateUser(id, { username, active, role }) {
    const body = {};
    if (username !== undefined) body.username = username;
    if (active !== undefined) body.active = active;
    if (role !== undefined) body.roles = [role];
    const { data } = await axiosInstance.put(API_ENDPOINTS.adminUserById(id), body);
    return data;
}

export async function resetUserPassword(id, password) {
    await axiosInstance.put(API_ENDPOINTS.adminUserPassword(id), { password });
}

export async function deactivateUser(id) {
    await axiosInstance.delete(API_ENDPOINTS.adminUserById(id));
}
