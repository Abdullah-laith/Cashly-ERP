'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type OrganizationSettings = {
  id?: string;
  user_id?: string;
  business_name: string;
  org_name?: string;
  logo_url: string;
  sales_channel: string;
  business_category: string;
  business_phone: string;
  business_address: string;
  address?: string;
  default_currency: string;
  currency?: string;
  trial_starts_at?: string;
  trial_ends_at?: string;
  subscription_status: string;
  onboarding_completed?: boolean;
};

const defaults: OrganizationSettings = {
  business_name: 'Cashly', logo_url: '', sales_channel: '', business_category: '',
  business_phone: '', business_address: '', default_currency: 'IQD', subscription_status: 'trial',
};

type OrganizationContextValue = {
  organization: OrganizationSettings;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
  trialDaysRemaining: number | null;
  trialExpired: boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<OrganizationSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const refreshOrganization = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('organization_settings').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setOrganization({ ...defaults, ...data, business_name: data.business_name || data.org_name || 'Cashly', business_address: data.business_address || data.address || '' });
    setLoading(false);
  }, []);

  useEffect(() => { void refreshOrganization(); }, [refreshOrganization]);

  const trialDaysRemaining = useMemo(() => {
    if (!organization.trial_ends_at || organization.subscription_status !== 'trial') return null;
    return Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / 86400000));
  }, [organization]);
  const trialExpired = organization.subscription_status === 'expired' || (trialDaysRemaining !== null && trialDaysRemaining <= 0);

  return <OrganizationContext.Provider value={{ organization, loading, refreshOrganization, trialDaysRemaining, trialExpired }}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used inside OrganizationProvider');
  return context;
}
