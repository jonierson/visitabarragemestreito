import React, { useState } from 'react';
import {
  Lock,
  FileSpreadsheet,
  FileText,
  Trash2,
  Search,
  Filter,
  Users,
  Calendar,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  LogOut,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Registration, VisitStats, Turma, DataVisita } from '../types';

interface AdminPanelProps {
  registrations: Registration[];
  stats: VisitStats;
  onDeleteRegistration: (id: string, adminPass?: string) => Promise<boolean>;
  onUpdateRegistration?: (
    id: string,
    updates: { dataVisita?: DataVisita; turma?: Turma; nome?: string },
    adminPass?: string
  ) => Promise<{ success: boolean; error?: string }>;
  onRefreshData: () => Promise<void>;
  onResetData?: (adminPass?: string) => Promise<boolean>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  registrations,
  stats,
  onDeleteRegistration,
  onUpdateRegistration,
  onRefreshData,
  onResetData,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [savedPassword, setSavedPassword] = useState('30012015');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTurma, setFilterTurma] = useState<string>('ALL');
  const [filterData, setFilterData] = useState<string>('ALL');

  // Deleting item modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Formatting date for table display
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    const ADMIN_PASS = '30012015';

    // Immediate password check (ensures access on Vercel static deployments and offline/cloud preview)
    if (passwordInput === ADMIN_PASS) {
      setIsAuthenticated(true);
      setSavedPassword(passwordInput);
      setPasswordInput('');
      setIsLoggingIn(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsAuthenticated(true);
          setSavedPassword(passwordInput || ADMIN_PASS);
          setPasswordInput('');
          setIsLoggingIn(false);
          return;
        } else {
          setAuthError(data.error || 'Senha incorreta. Tente novamente.');
          setIsLoggingIn(false);
          return;
        }
      }
    } catch {
      // Server route unreachable or static host
    }

    setAuthError('Senha incorreta. Tente novamente.');
    setIsLoggingIn(false);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  // Filtered registrations
  const filteredList = registrations.filter((r) => {
    const matchesSearch =
      r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.turma.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurma = filterTurma === 'ALL' || r.turma === filterTurma;
    const matchesData = filterData === 'ALL' || r.dataVisita === filterData;
    return matchesSearch && matchesTurma && matchesData;
  });

  // Export to Excel (.xlsx) using sheetjs
  const handleExportExcel = () => {
    if (registrations.length === 0) {
      alert('Não há inscrições para exportar.');
      return;
    }

    // Format rows
    const rows = registrations.map((r, index) => ({
      'Nº': index + 1,
      'Nome do Estudante': r.nome,
      Turma: r.turma,
      'Data da Visita': r.dataVisita,
      'Data e Hora da Inscrição': formatDateTime(r.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Adjust column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos');

    // Add summary worksheet
    const summaryData = [
      { Categoria: 'Total de Inscritos', Valor: stats.totalRegistrations },
      { Categoria: 'Inscritos 15/08', Valor: stats.byData['15/08'] },
      { Categoria: 'Inscritos 29/08', Valor: stats.byData['29/08'] },
      { Categoria: '3º BIOTEC', Valor: stats.byTurma['3º BIOTEC'] },
      { Categoria: '3º A INFO', Valor: stats.byTurma['3º A INFO'] },
      { Categoria: '3º B INFO', Valor: stats.byTurma['3º B INFO'] },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Estatístico');

    XLSX.writeFile(workbook, `Inscricoes_Barragem_Estreito_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert('Não há inscrições para exportar.');
      return;
    }

    const headers = ['Nome', 'Turma', 'Data Escolhida', 'Horário da Inscrição'];
    const csvRows = [
      headers.join(';'),
      ...registrations.map((r) =>
        [
          `"${r.nome.replace(/"/g, '""')}"`,
          `"${r.turma}"`,
          `"${r.dataVisita}"`,
          `"${formatDateTime(r.createdAt)}"`,
        ].join(';')
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM for Excel compatibility in PT-BR
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inscricoes_Barragem_Estreito_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const passToUse = savedPassword || passwordInput || '30012015';
    const success = await onDeleteRegistration(deleteId, passToUse);
    setIsDeleting(false);
    setDeleteId(null);
    if (success) {
      await onRefreshData();
    } else {
      alert('Erro ao excluir a inscrição. Tente novamente.');
    }
  };

  const handleReset = async () => {
    if (onResetData) {
      const passToUse = savedPassword || passwordInput || '30012015';
      const success = await onResetData(passToUse);
      setShowResetConfirm(false);
      if (success) {
        await onRefreshData();
      } else {
        alert('Erro ao resetar os registros. Tente novamente.');
      }
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Painel Administrativo</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Digite a senha de administrador para acessar as estatísticas e exportar os dados.
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Senha de Acesso:
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-900 font-medium text-sm"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // Admin Dashboard Content
  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md w-max mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Sessão de Administrador Ativa</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Painel de Gerenciamento das Inscrições
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Acompanhe o quantitativo por turma e data e exporte relatórios em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar para Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-sm transition-all text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar para CSV</span>
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Sair do painel"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Overall */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Inscritos</span>
            <div className="text-2xl font-black text-slate-900">{stats.totalRegistrations}</div>
            <span className="text-xs text-slate-400 font-medium">de 76 vagas no total</span>
          </div>
        </div>

        {/* Total Data 15/08 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inscritos em 15/08</span>
            <div className="text-2xl font-black text-slate-900">{stats.byData['15/08']} / 38</div>
            <span className="text-xs text-slate-400 font-medium">
              {stats.capacities['15/08']?.available} vagas restantes
            </span>
          </div>
        </div>

        {/* Total Data 29/08 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inscritos em 29/08</span>
            <div className="text-2xl font-black text-slate-900">{stats.byData['29/08']} / 38</div>
            <span className="text-xs text-slate-400 font-medium">
              {stats.capacities['29/08']?.available} vagas restantes
            </span>
          </div>
        </div>

        {/* Breakdown by Turma */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Por Turma</span>
          </span>
          <div className="space-y-1 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-600">3º BIOTEC:</span>
              <span className="font-extrabold text-blue-800">{stats.byTurma['3º BIOTEC']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">3º A INFO:</span>
              <span className="font-extrabold text-blue-800">{stats.byTurma['3º A INFO']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">3º B INFO:</span>
              <span className="font-extrabold text-blue-800">{stats.byTurma['3º B INFO']}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou turma..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-bold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros:</span>
            </div>

            <select
              value={filterTurma}
              onChange={(e) => setFilterTurma(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Turmas</option>
              <option value="3º BIOTEC">3º BIOTEC</option>
              <option value="3º A INFO">3º A INFO</option>
              <option value="3º B INFO">3º B INFO</option>
            </select>

            <select
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Datas</option>
              <option value="15/08">15/08</option>
              <option value="29/08">29/08</option>
            </select>

            {(searchTerm || filterTurma !== 'ALL' || filterData !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterTurma('ALL');
                  setFilterData('ALL');
                }}
                className="text-blue-600 hover:underline text-xs font-semibold"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Nome do Estudante</th>
                <th className="py-3.5 px-4">Turma</th>
                <th className="py-3.5 px-4">Data Escolhida</th>
                <th className="py-3.5 px-4">Horário da Inscrição</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Nenhuma inscrição encontrada com os critérios selecionados.</span>
                  </td>
                </tr>
              ) : (
                filteredList.map((reg, idx) => (
                  <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{reg.nome}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {reg.turma}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {reg.dataVisita}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {formatDateTime(reg.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteId(reg.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Excluir inscrição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Danger Zone */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Exibindo {filteredList.length} de {registrations.length} inscrições ativas.
          </span>

          {onResetData && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-red-600 hover:text-red-800 hover:underline font-bold text-xs"
            >
              Resetar / Limpar todas as inscrições
            </button>
          )}
        </div>
      </div>

      {/* Modal Confirm Delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Excluir Inscrição?
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Esta ação liberará novamente 1 vaga no sistema para a data correspondente.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Zerar Todas as Inscrições?
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Você tem certeza que deseja APAGAR TODAS as inscrições registradas? Esta operação não pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                >
                  Zerar Registros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
