import React from 'react';
import { Calendar, Users, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DateCapacity, DataVisita } from '../types';

interface CapacityCardsProps {
  capacities: Record<DataVisita, DateCapacity>;
  selectedDate?: DataVisita | '';
  onSelectDate?: (date: DataVisita) => void;
}

export const CapacityCards: React.FC<CapacityCardsProps> = ({
  capacities,
  selectedDate,
  onSelectDate,
}) => {
  const dates: DataVisita[] = ['15/08', '29/08'];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>Vagas Disponíveis por Data</span>
        </h2>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          Atualização em tempo real
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {dates.map((date) => {
          const cap = capacities[date] || {
            dataVisita: date,
            totalLimit: 38,
            occupied: 0,
            available: 38,
            isFull: false,
          };

          const isSelected = selectedDate === date;
          const percentOccupied = Math.min(100, Math.round((cap.occupied / cap.totalLimit) * 100));
          const isFull = cap.isFull || cap.available <= 0;
          const isLow = !isFull && cap.available <= 8;

          return (
            <div
              key={date}
              onClick={() => {
                if (!isFull && onSelectDate) {
                  onSelectDate(date);
                }
              }}
              className={`relative bg-white rounded-2xl p-5 border transition-all duration-300 shadow-sm ${
                isFull
                  ? 'border-slate-200 bg-slate-50/70 opacity-90'
                  : isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
              }`}
            >
              {isSelected && !isFull && (
                <div className="absolute -top-3 right-4 bg-blue-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selecionada
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-100 px-2.5 py-0.5 rounded-md">
                    CARD {date === '15/08' ? '1' : '2'}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <span>Data: {date}</span>
                  </h3>
                </div>

                <div>
                  {isFull ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg">
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      Esgotado
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Últimas Vagas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Disponível
                    </span>
                  )}
                </div>
              </div>

              {/* Number of available spots */}
              <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">Vagas disponíveis:</span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-blue-700'}`}>
                    {cap.available}
                  </span>
                  <span className="text-slate-500 font-semibold text-sm"> / {cap.totalLimit}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                  <span>Inscrições: {cap.occupied} de {cap.totalLimit}</span>
                  <span>{percentOccupied}% ocupado</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull
                        ? 'bg-red-500'
                        : isLow
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    }`}
                    style={{ width: `${percentOccupied}%` }}
                  />
                </div>
              </div>

              {isFull && (
                <div className="mt-3 text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Não há mais vagas para esta data.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
