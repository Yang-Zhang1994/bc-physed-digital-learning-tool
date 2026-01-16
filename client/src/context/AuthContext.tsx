import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../api/api';
import { usePet } from './PetContext'; // 🐾 import this

type User = {
  id: string;
  username: string;
  type?: 'student' | 'teacher';
  petLevel: number;
  completedModules: string[];
};

type AuthContextType = {
  user: User | null;
  login: (u: string, p: string) => Promise<User>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { refreshPetData } = usePet(); // 🐾 use pet context

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      api.get('/api/auth/me')
        .then(res => setUser(res.data.user))
        .then(refreshPetData) // 🐾 load pet data when auth rehydrates
        .catch(() => setAuthToken());
    }
  }, []);

  async function login(username: string, password: string): Promise<User> {
    const res = await api.post('/api/auth/login', { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    await refreshPetData(); // 🐾 load pet info after login
    return res.data.user as User;
  }

  async function register(username: string, password: string) {
    await api.post('/api/auth/register', { username, password });
  }

  function logout() {
    setAuthToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
