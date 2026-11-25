'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { soundEngine } from '@/lib/sound-engine';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundEngine.isEnabled());
    const onChange = (event: Event) => setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener('cashly-sound-change', onChange);
    return () => window.removeEventListener('cashly-sound-change', onChange);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    soundEngine.setEnabled(next);
    if (next) soundEngine.playToggle();
  };

  return (
    <button
      type="button"
      aria-label={enabled ? 'كتم المؤثرات الصوتية' : 'تشغيل المؤثرات الصوتية'}
      title={enabled ? 'كتم الصوت' : 'تشغيل الصوت'}
      onClick={toggle}
      className="icon-button"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
    </button>
  );
}
