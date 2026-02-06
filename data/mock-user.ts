export interface MockUser {
  id: string;
  name: string;
  firstName: string;
  email: string;
  initials: string;
}

export const mockUser: MockUser = {
  id: 'user-001',
  name: 'Tenzin',
  firstName: 'Tenzin',
  email: 'tenzin@example.com',
  initials: 'T',
};
