import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../api/api';
import { usePet } from './PetContext';

type User = {
  id: string;
  username: string;
  type?: 'student' | 'teacher' | 'admin';
  role?: 'student' | 'teacher' | 'admin';
  petLevel: number;
  completedModules: string[];
};

type AuthContextType = {
  user: User | null;
  login: (u: string, p: string) => Promise<User>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  authReady: boolean;
};

const AuthContext = createContext<AuthContextType>({} as any);

function normalizeUser(raw: any): User {
  return {
    id: raw.id || raw._id,
    username: raw.username,
    type: raw.type ?? raw.role,
    role: raw.role ?? raw.type,
    petLevel: raw.petLevel ?? 1,
    completedModules: raw.completedModules ?? [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { refreshPetData } = usePet();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Clear any leftover localStorage JWT from older builds
      setAuthToken();
      try {
        const me = await api.get('/api/auth/me');
        if (cancelled) return;
        setUser(normalizeUser(me.data.user));
        await refreshPetData();
      } catch {
        try {
          const refreshed = await api.post('/api/auth/refresh');
          if (cancelled) return;
          if (refreshed.data?.user) {
            setUser(normalizeUser(refreshed.data.user));
            await refreshPetData();
          }
        } catch {
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshPetData]);

  async function login(username: string, password: string): Promise<User> {
    const res = await api.post('/api/auth/login', { username, password });
    const u = normalizeUser(res.data.user);
    setUser(u);
    await refreshPetData();
    return u;
  }

  async function register(username: string, password: string) {
    await api.post('/api/auth/register', { username, password });
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* still clear local session */
    }
    setAuthToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
