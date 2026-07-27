import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Turma,
  DataVisita,
  RegistrationFormData,
  Registration,
  DateCapacity,
} from '../types';

interface RegistrationFormProps {
  capacities: Record<DataVisita, DateCapacity>;
  onSubmit: (data: RegistrationFormData) => Promise<{ success: boolean; registration?: Registration; error?: string }>;
  selectedDateFromCard?: DataVisita | '';
  onDateChange?: (date: DataVisita) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  capacities,
  onSubmit,
  selectedDateFromCard,
  onDateChange,
}) => {
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState<Turma | ''>('');
  const [dataVisita, setDataVisita] = useState<DataVisita | ''>(selectedDateFromCard || '');

  // Keep internal state synced if card selected
  React.useEffect(() => {
    if (selectedDateFromCard) {
      setDataVisita(selectedDateFromCard);
    }
  }, [selectedDateFromCard]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completedRegistration, setCompletedRegistration] = useState<Registration | null>(null);

  const turmas: Turma[] = ['3º BIOTEC', '3º A INFO', '3º B INFO'];
  const datas: DataVisita[] = ['15/08', '29/08'];

  // Name validation helper
  const isNameValid = (nameStr: string) => {
    const trimmed = nameStr.trim().replace(/\s+/g, ' ');
    const parts = trimmed.split(' ').filter((p) => p.length >= 2);
    return parts.length >= 2;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate empty
    if (!nome.trim()) {
      setErrorMsg('Por favor, digite seu nome completo.');
      return;
    }

    if (!isNameValid(nome)) {
      setErrorMsg('O campo nome deve conter pelo menos dois nomes (primeiro e último nome). Exemplo: João Silva');
      return;
    }

    if (!turma) {
      setErrorMsg('Selecione a sua turma.');
      return;
    }

    if (!dataVisita) {
      setErrorMsg('Selecione a data desejada para a visita.');
      return;
    }

    // Check date availability
    const dateCap = capacities[dataVisita];
    if (dateCap && (dateCap.isFull || dateCap.available <= 0)) {
      setErrorMsg('Não há mais vagas para esta data. Por favor, escolha a outra data disponível.');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onSubmit({
        nome: nome.trim(),
        turma,
        dataVisita,
      });

      if (res.success && res.registration) {
        setCompletedRegistration(res.registration);
        setShowConfirmModal(false);
        // Reset form fields
        setNome('');
        setTurma('');
        setDataVisita('');
        if (onDateChange) onDateChange('' as DataVisita);
      } else {
        setErrorMsg(res.error || 'Ocorreu um erro ao realizar a inscrição. Tente novamente.');
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão ao processar inscrição.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedRegistration) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle className="w-10 h-10" />
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Comprovante de Inscrição
          </span>

          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Inscrição realizada com sucesso!
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Sua vaga está garantida para a Visita Técnica à Barragem do Estreito.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome:</span>
              <span className="text-sm font-black text-slate-900">{completedRegistration.nome}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turma:</span>
              <span className="text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                {completedRegistration.turma}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data escolhida:</span>
              <span className="text-sm font-black text-slate-900 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
                {completedRegistration.dataVisita}
              </span>
            </div>
          </div>

          <button
            onClick={() => setCompletedRegistration(null)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all duration-200 cursor-pointer"
          >
            <span>Realizar outra inscrição</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md relative">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Send className="w-6 h-6 text-blue-600" />
          <span>Realizar Inscrição</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Preencha os dados abaixo para reservar sua vaga na visita técnica.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Atenção</span>
            {errorMsg}
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleInitialSubmit} className="space-y-6">
        {/* 1. Nome Completo */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Primeiro e último nome</span>
            </span>
            <span className="text-xs text-red-500 font-normal">* obrigatório</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Exemplo: João Silva"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Deve conter pelo menos dois nomes para identificação oficial.
          </p>
        </div>

        {/* 2. Turma */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>2. Turma</span>
            </span>
            <span className="text-xs text-red-500 font-normal">* obrigatório</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {turmas.map((t) => (
              <label
                key={t}
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  turma === t
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 font-bold text-blue-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="turma"
                  value={t}
                  checked={turma === t}
                  onChange={() => {
                    setTurma(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
                <span className="text-sm">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 3. Data da Visita */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>3. Data da visita</span>
            </span>
            <span className="text-xs text-red-500 font-normal">* obrigatório</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {datas.map((d) => {
              const cap = capacities[d] || { isFull: false, available: 38 };
              const isFull = cap.isFull || cap.available <= 0;

              return (
                <div key={d} className="flex flex-col">
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isFull
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-80'
                        : dataVisita === d
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 font-bold text-blue-900 cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="dataVisita"
                        value={d}
                        disabled={isFull}
                        checked={dataVisita === d}
                        onChange={() => {
                          if (!isFull) {
                            setDataVisita(d);
                            if (onDateChange) onDateChange(d);
                            if (errorMsg) setErrorMsg(null);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600 disabled:opacity-50"
                      />
                      <span className="text-sm font-semibold">Data: {d}</span>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        isFull
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull ? 'Esgotado' : `${cap.available} vagas`}
                    </span>
                  </label>
                  {isFull && (
                    <span className="text-xs text-red-600 mt-1 font-medium pl-1">
                      Não há mais vagas para esta data.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando Inscrição...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>REALIZAR INSCRIÇÃO</span>
            </>
          )}
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span>Confirmar Dados da Inscrição</span>
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-sm text-slate-600">
              <p className="mb-4 font-medium text-slate-700">
                Por favor, verifique se todas as informações estão corretas antes de confirmar:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Nome:</span>
                  <span className="font-extrabold text-slate-900">{nome.trim()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Turma:</span>
                  <span className="font-extrabold text-blue-700">{turma}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Data escolhida:</span>
                  <span className="font-extrabold text-emerald-800">{dataVisita}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Corrigir
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
