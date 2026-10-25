import { ref, onMounted } from 'vue';

export const useTheme = () => {
  const isDark = ref(true);
  const toggleTheme = () => {
    isDark.value = !isDark.value;
    if (typeof window !== 'undefined') {
      if (isDark.value) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };
  const initTheme = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark.value = saved === 'dark' || (!saved && prefersDark);
      document.documentElement.classList.toggle('dark', isDark.value);
    }
  };
  onMounted(initTheme);
  return { isDark, toggleTheme };
};