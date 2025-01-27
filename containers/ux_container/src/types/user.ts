export interface UserSettings {
  id: number;
  userId: number;
  theme: string;
  settings: Record<string, any> | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  containerId: string | null;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any> | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  settings: UserSettings | null;
  projects: Project[];
}
