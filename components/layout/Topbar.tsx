import { Bell, Sun, Moon, Plus, User } from 'lucide-react';
import { useState } from 'react';

export default function Topbar() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <header className="h-16 bg-[#070B14] border-b border-slate-800 flex items-center justify-between px-6 text-white">
      <div className="flex items-center gap-4">
        <button className="bg-[#FF685B] hover:bg-[#ff5545] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> إنشاء فاتورة
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="p-2 hover:bg-slate-800 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="text-right">
            <div className="text-sm font-medium">عبد الله ليث</div>
            <div className="text-xs text-slate-400">مدير النظام</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
