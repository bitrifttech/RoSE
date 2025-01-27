import { User } from '@/types/user';
import { ORCHESTRATOR_API } from './config';

const API_BASE = 'http://localhost:8000/api';

export async function createUser(email: string, name: string): Promise<User> {
  const response = await fetch(`${ORCHESTRATOR_API}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, name }),
  });

  if (!response.ok) {
    throw new Error('Failed to create user');
  }

  return response.json();
}

export async function getUser(id: number): Promise<User> {
  const response = await fetch(`${ORCHESTRATOR_API}/users/${id}`);

  if (!response.ok) {
    throw new Error('Failed to get user');
  }

  return response.json();
}

export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(`${ORCHESTRATOR_API}/users`);

  if (!response.ok) {
    throw new Error('Failed to get users');
  }

  return response.json();
}
