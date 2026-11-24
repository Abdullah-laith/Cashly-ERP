'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <SonnerToaster richColors position="bottom-left" />
    </>
  );
};

export const useToast = () => {
  return {
    showToast: (msg: string) => toast(msg),
    toast: toast
  };
};
