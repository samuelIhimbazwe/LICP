import { useCallback, useEffect, useState } from 'react';
import { apiRequest, apiRequestSafe } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface NotificationPreferences {
  channels: { inApp: boolean; email: boolean; sms: boolean };
  typePreferences: Record<string, ('in_app' | 'email' | 'sms')[]>;
  quietHours?: { enabled: boolean; startTime: string; endTime: string };
  emailDigest?: { enabled: boolean; frequency: 'daily' | 'weekly'; time: string };
  subscriptions?: { jurisdictions: string[]; categories: string[] };
}

export interface DeliveryLog {
  id: string;
  channel: string;
  status: string;
  title: string;
  message: string;
  failureReason?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  priority: string;
  targetAudience: string;
  channels: string[];
  recipientCount: number;
  readCount: number;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerCondition: string;
  escalationDelay: number;
  escalateTo: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export function useNotificationExtras() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [prefs, logRes, broadcastRes, rulesRes] = await Promise.all([
        apiRequestSafe<{ preferences: NotificationPreferences }>('/notifications/preferences'),
        apiRequestSafe<{ logs: DeliveryLog[] }>('/notifications/logs'),
        isAdmin
          ? apiRequestSafe<{ broadcasts: BroadcastMessage[] }>('/notifications/broadcasts')
          : Promise.resolve({ broadcasts: [] as BroadcastMessage[] }),
        isAdmin
          ? apiRequestSafe<{ rules: EscalationRule[] }>('/notifications/escalation-rules')
          : Promise.resolve({ rules: [] as EscalationRule[] }),
      ]);
      setPreferences(prefs.preferences ?? null);
      setLogs(logRes.logs ?? []);
      setBroadcasts(broadcastRes.broadcasts ?? []);
      setEscalationRules(rulesRes.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreferences = async (next: NotificationPreferences) => {
    const result = await apiRequest<{ preferences: NotificationPreferences }>(
      '/notifications/preferences',
      { method: 'PUT', body: JSON.stringify(next) }
    );
    setPreferences(result.preferences);
  };

  const sendBroadcast = async (payload: {
    title: string;
    message: string;
    priority?: string;
    channels?: string[];
  }) => {
    await apiRequest('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ ...payload, targetAudience: 'all' }),
    });
    await refresh();
  };

  const toggleEscalationRule = async (id: string, isActive: boolean) => {
    await apiRequest(`/notifications/escalation-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    await refresh();
  };

  return {
    preferences,
    logs,
    broadcasts,
    escalationRules,
    loading,
    refresh,
    savePreferences,
    sendBroadcast,
    toggleEscalationRule,
  };
}
