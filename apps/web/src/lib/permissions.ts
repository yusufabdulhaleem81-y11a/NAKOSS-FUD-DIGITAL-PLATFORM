/** Permission keys mirror the DB `permissions.key` values exactly. */
export const PERMISSION = {
  MEMBERS_VIEW: 'members.view',
  MEMBERS_VERIFY: 'members.verify',
  ANALYTICS_VIEW: 'analytics.view',
  TASKS_VIEW_ALL: 'tasks.view_all',
  TASKS_ASSIGN: 'tasks.assign',
  REPORTS_SUBMIT: 'reports.submit',
  REPORTS_REVIEW: 'reports.review',
  SUBMISSIONS_RESPOND: 'governance.submissions.respond',
  CONTENT_APPROVE: 'content.approve',
  NEWS_MANAGE: 'content.news.manage',
  EVENTS_MANAGE: 'content.events.manage',
  GALLERY_MANAGE: 'content.gallery.manage',
  DOCUMENTS_MANAGE: 'content.documents.manage',
  RESOURCES_UPLOAD: 'resources.upload',
  FINANCE_MANAGE: 'finance.manage',
  WELFARE_MANAGE: 'welfare.manage',
  EXCO_INVITE: 'exco.invite',
  ADMINISTRATIONS_MANAGE: 'administrations.manage',
  AUDIT_VIEW: 'audit.view',
  SYSTEM_ADMIN: 'system.admin',
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];