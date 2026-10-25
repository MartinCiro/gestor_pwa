import { ref, computed } from 'vue';

const user = ref<any>(null);
const isAuthenticated = computed(() => user.value !== null);

const login = (email: string) => {
  const emailLower = email.trim().toLowerCase();
  if (emailLower === 'ciro@admin.com' || emailLower === 'user@test.com') {
    user.value = {
      email: emailLower,
      nombreRol: emailLower === 'ciro@admin.com' ? 'Administrador' : 'Operador',
      permisos: ['lee:Casos', 'crea:Casos', 'edita:Casos', 'elimina:Casos']
    };
    if (typeof window !== 'undefined') localStorage.setItem('mock_user', JSON.stringify(user.value));
    return true;
  }
  return false;
};

const logout = () => {
  user.value = null;
  if (typeof window !== 'undefined') localStorage.removeItem('mock_user');
};

const initAuth = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mock_user');
    if (stored) {
      try { user.value = JSON.parse(stored); } 
      catch { localStorage.removeItem('mock_user'); }
    }
  }
};

export const useAuth = () => {
  initAuth();
  return { user, isAuthenticated, login, logout };
};