import React from 'react';
import { Landmark } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Landmark className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-bold text-slate-200">
            Campus Araguaína – IFTO
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Instituto Federal de Educação, Ciência e Tecnologia do Tocantins
        </p>
        <p className="text-[11px] text-slate-600 mt-2">
          Visita Técnica à Barragem do Estreito • Sistema Oficial de Inscrições
        </p>
      </div>
    </footer>
  );
};
