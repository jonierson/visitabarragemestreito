import React from 'react';
import { Landmark, Shield, UserCheck, CalendarDays } from 'lucide-react';

interface HeaderProps {
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
  totalRegistrations: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdminOpen,
  onToggleAdmin,
  totalRegistrations,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg border-b border-blue-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shrink-0">
              <Landmark className="w-8 h-8 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  Campus Araguaína – IFTO
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-blue-200 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {totalRegistrations} inscrito{totalRegistrations !== 1 ? 's' : ''}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase">
                VISITA TÉCNICA À BARRAGEM DO ESTREITO
              </h1>
              <p className="text-sm sm:text-base text-blue-100/90 mt-1 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-300 shrink-0" />
                <span>Escolha apenas uma das datas disponíveis para a sua turma.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onToggleAdmin}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm ${
                isAdminOpen
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isAdminOpen ? 'Voltar para Inscrições' : 'Painel Admin'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
