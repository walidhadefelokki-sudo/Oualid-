import api from './api';

// Shape kept identical to the old Supabase rows so Dashboard.tsx's
// existing rendering code (n.is_read, n.created_at, ...) doesn't need
// to change.
export interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function mapNotification(n: any): ApiNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: n.read,
    created_at: n.createdAt,
  };
}

export async function getNotifications(): Promise<ApiNotification[]> {
  const { data } = await api.get('/notifications');
  return (data.data || []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}