import { ref } from 'vue';
export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: number; message: string; type: ToastType; }

const toasts = ref<Toast[]>([]);
let counter = 0;

export const useToast = () => {
  const push = (message: string, type: ToastType = 'success', duration = 3500) => {
    const id = ++counter;
    toasts.value.push({ id, message, type });
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, duration);
  };
  return { toasts, push };
};