import React from 'react';
import { User, LogOut, Send, ShieldCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { BuBusinessLogo } from './BuLogo';

interface NavbarProps {
  currentTab: 'student' | 'instructor';
  onSelectTab: (tab: 'student' | 'instructor') => void;
  user: FirebaseUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('student')}>
            <BuBusinessLogo variant="icon" size="md" className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-xs" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900">ClassSubmit</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-[#bc1b11] border border-rose-200">
                  BU Business
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">คณะบริหารธุรกิจ มหาวิทยาลัยกรุงเทพ • ระบบส่งงาน</p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => onSelectTab('student')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>ส่งงาน (นักศึกษา)</span>
            </button>
            <button
              onClick={() => onSelectTab('instructor')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'instructor'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ระบบอาจารย์</span>
            </button>
          </div>

          {/* Instructor Auth Info */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex items-center space-x-2 text-right">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">{user.displayName || 'อาจารย์ผู้สอน'}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </div>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-9 h-9 rounded-full ring-2 ring-indigo-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {user.email ? user.email[0].toUpperCase() : 'T'}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  title="ออกจากระบบอาจารย์"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelectTab('instructor')}
                className="hidden sm:inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>สำหรับผู้สอน</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
