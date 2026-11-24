import { toast } from 'sonner';

export const handleSupabaseError = (error: any, customMessage?: string) => {
  console.error('Supabase Error:', error);
  toast.error(customMessage || error.message || 'حدث خطأ غير متوقع في النظام');
};
