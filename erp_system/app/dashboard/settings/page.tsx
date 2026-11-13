'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Upload, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ id: '', org_name: '', currency: 'د.ع', address: '', logo_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('organization_settings').select('*').single();
      if (data) setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // بما أننا نستخدم RLS، يجب أن نرسل الـ ID الحالي لتحديث نفس السجل
    const { error } = await supabase.from('organization_settings').upsert({
        ...settings
    });

    if (error) {
        console.error("Save error:", error);
        alert('خطأ: ' + error.message);
    } else {
        alert('تم حفظ الإعدادات بنجاح');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-white">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-8">
      <div className="border-b border-slate-700/60 pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">إعدادات المؤسسة</h1>
        <p className="text-slate-400 text-sm mt-1">تخصيص بيانات نظامك وتحديد هوية مؤسستك.</p>
      </div>

      <Card className="bg-[#1E293B] border border-slate-700/60 shadow-md rounded-xl">
        <CardHeader className="border-b border-slate-700/60 py-4 px-6">
          <CardTitle className="text-slate-200">معلومات المؤسسة</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-400">اسم المؤسسة</Label>
              <Input
                value={settings.org_name}
                onChange={(e) => setSettings({...settings, org_name: e.target.value})}
                className="bg-[#0B1120] border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">العملة الافتراضية</Label>
              <Input
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="bg-[#0B1120] border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400">عنوان المؤسسة</Label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({...settings, address: e.target.value})}
              className="bg-[#0B1120] border-slate-700 text-white"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold w-full md:w-auto">
            <Save className="ml-2 w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
