import api from './axios';

export const auditApi = {
  getAuditTrail: (filters?: {
    fromDate?: string;
    toDate?: string;
    actor?: string;
    actionType?: string;
    udlrn?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/audit-trail', { params: filters }),

  exportAuditCsv: (filters?: {
    fromDate?: string;
    toDate?: string;
    actor?: string;
    actionType?: string;
  }) =>
    api.get('/audit-trail/export', {
      params: filters,
      responseType: 'blob',
    }),
};

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}
