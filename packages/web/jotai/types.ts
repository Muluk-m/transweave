export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Team {
  id: string;
  name: string;
  url: string;
  createdAt?: number;
  updatedAt?: number;
  memberships?: Membership[];
  // no
  projectCount?: number;
  memberCount?: number;
}

export interface Membership {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface ProjectModule {
  code: string;        // 模块代码，用作 key 前缀
  description?: string; // 可选描述
}

export interface Project {
  id: string;
  name: string;
  url: string;
  defaultLang?: string;
  tokens: Token[];
  ownerId: string;
  teamId: string;
  memberships: Membership[];
  description?: string;
  languages: string[];
  languageLabels?: Record<string, string>; // 自定义语言的中文备注
  modules?: ProjectModule[];
  enableVersioning?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface TokenHistory {
  id: string;
  user?: User;
  translations: Record<string, any>;
  createdAt: string;
}

export interface Token {
  id: string;
  key: string;
  module?: string;
  translations: Translation;
  tags: string[];
  comment?: string;
  screenshots?: string[];
  history?: TokenHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Translation {
  [key: string]: string;
}

// Activity Log types
export enum ActivityType {
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  PROJECT_LANGUAGE_ADD = 'PROJECT_LANGUAGE_ADD',
  PROJECT_LANGUAGE_REMOVE = 'PROJECT_LANGUAGE_REMOVE',
  TOKEN_CREATE = 'TOKEN_CREATE',
  TOKEN_UPDATE = 'TOKEN_UPDATE',
  TOKEN_DELETE = 'TOKEN_DELETE',
  TOKEN_BATCH_UPDATE = 'TOKEN_BATCH_UPDATE',
  PROJECT_EXPORT = 'PROJECT_EXPORT',
  PROJECT_IMPORT = 'PROJECT_IMPORT',
}

export interface ActivityDetails {
  entityId?: string;
  entityType?: 'project' | 'token';
  entityName?: string;
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  language?: string;
  format?: string;
  mode?: string;
  stats?: {
    added?: number;
    updated?: number;
    unchanged?: number;
    total?: number;
  };
  metadata?: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  type: ActivityType;
  projectId: string;
  userId: string | User;  // Can be string or populated User object
  details: ActivityDetails;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt?: string;
}
