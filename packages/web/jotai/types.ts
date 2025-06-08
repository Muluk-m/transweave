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
  createdAt?: number;
  updatedAt?: number;
}

export interface TokenHistory {
  user?: User;
  translations: Record<string, any>;
  createdAt: string;
}

export interface Token {
  id: string;
  key: string;
  translations: Translation[];
  tags: string[];
  comment?: string;
  history?: TokenHistory[];
}

export interface Translation {
  lang: string;
  text: string;
}
