import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CapacityCards } from './components/CapacityCards';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminPanel } from './components/AdminPanel';
import { Footer } from './components/Footer';
import {
  Registration,
  VisitStats,
  RegistrationFormData,
  DataVisita,
  Turma,
} from './types';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

const MAX_SPOTS = 38;

function computeVisitStats(regs: Registration[]): VisitStats {
  const count15 = regs.filter((r) => r.dataVisita === '15/08').length;
  const count29 = regs.filter((r) => r.dataVisita === '29/08').length;

  return {
    capacities: {
      '15/08': {
        dataVisita: '15/08',
        totalLimit: MAX_SPOTS,
        occupied: count15,
        available: Math.max(0, MAX_SPOTS - count15),
        isFull: count15 >= MAX_SPOTS,
      },
      '29/08': {
        dataVisita: '29/08',
        totalLimit: MAX_SPOTS,
        occupied: count29,
        available: Math.max(0, MAX_SPOTS - count29),
        isFull: count29 >= MAX_SPOTS,
      },
    },
    totalRegistrations: regs.length,
    byTurma: {
      '3º BIOTEC': regs.filter((r) => r.turma === '3º BIOTEC').length,
      '3º A INFO': regs.filter((r) => r.turma === '3º A INFO').length,
      '3º B INFO': regs.filter((r) => r.turma === '3º B INFO').length,
    },
    byData: {
      '15/08': count15,
      '29/08': count29,
    },
  };
}

function normalizeSupabaseRow(row: any): Registration {
  return {
    id: String(row.id),
    nome: String(row.nome || row.name || ''),
    turma: (row.turma || '3º BIOTEC') as Turma,
    dataVisita: (row.dataVisita || row.data_visita || row.datavisita || '15/08') as DataVisita,
    createdAt: String(row.createdAt || row.created_at || row.createdat || new Date().toISOString()),
  };
}

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedDateCard, setSelectedDateCard] = useState<DataVisita | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<VisitStats>(computeVisitStats([]));

  // Direct Supabase fetch
  const fetchDirectFromSupabase = useCallback(async (): Promise<Registration[]> => {
    try {
      const { data, error } = await supabase.from('registrations').select('*');
      if (!error && Array.isArray(data)) {
        const normalized = data.map(normalizeSupabaseRow).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return normalized;
      }
    } catch (err) {
      console.warn('Direct Supabase fetch error:', err);
    }
    return [];
  }, []);

  // Fetch data function
  const fetchData = useCallback(async () => {
    // 1. Fetch directly from Supabase first (most reliable for Vercel & static/Jamstack deployments)
    const supaRegs = await fetchDirectFromSupabase();

    if (supaRegs.length > 0) {
      setRegistrations(supaRegs);
      setStats(computeVisitStats(supaRegs));
      setIsLoading(false);
      return;
    }

    // 2. Secondary fallback: backend API
    try {
      const res = await fetch(`/api/registrations?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registrations && data.registrations.length > 0) {
          setRegistrations(data.registrations);
          if (data.stats) setStats(data.stats);
        } else {
          setRegistrations(supaRegs);
          setStats(computeVisitStats(supaRegs));
        }
      } else {
        setRegistrations(supaRegs);
        setStats(computeVisitStats(supaRegs));
      }
    } catch (err) {
      console.warn('Error fetching registrations from /api, using Supabase data:', err);
      setRegistrations(supaRegs);
      setStats(computeVisitStats(supaRegs));
    } finally {
      setIsLoading(false);
    }
  }, [fetchDirectFromSupabase]);

  // Initial load, periodic polling, and Supabase Realtime subscription for instant updates
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 4000); // Poll every 4 seconds

    const channel = supabase
      .channel('public:registrations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Handle new registration
  const handleRegister = async (formData: RegistrationFormData) => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        // ignore parse error if response is not JSON
      }

      if (res.ok && data.success) {
        if (data.stats) setStats(data.stats);
        await fetchData();
        return {
          success: true,
          registration: data.registration,
        };
      }

      // If res.status is NOT 404 and returned a specific validation message (e.g., 400 bad request), return it
      if (res.status !== 404 && data && data.error) {
        return {
          success: false,
          error: data.error,
        };
      }
    } catch (err) {
      console.warn('Backend API submission failed, falling back to direct Supabase connection...');
    }

    // Direct Supabase Fallback for registration (e.g., when deployed on static host or 404)
    try {
      const trimmedName = (formData.nome || '').trim().replace(/\s+/g, ' ');
      const nameParts = trimmedName.split(' ').filter((p) => p.length >= 2);

      if (nameParts.length < 2) {
        return {
          success: false,
          error: 'Por favor, informe seu primeiro e último nome (pelo menos dois nomes).',
        };
      }

      const currentRegs = await fetchDirectFromSupabase();

      // Check date capacity
      const countForDate = currentRegs.filter((r) => r.dataVisita === formData.dataVisita).length;
      if (countForDate >= MAX_SPOTS) {
        return {
          success: false,
          error: 'Não há mais vagas para esta data.',
        };
      }

      // Check duplicate
      const isDuplicate = currentRegs.some(
        (r) =>
          r.nome.trim().toLowerCase() === trimmedName.toLowerCase() &&
          r.turma === formData.turma
      );

      if (isDuplicate) {
        return {
          success: false,
          error: `Já existe uma inscrição cadastrada para "${trimmedName}" na turma ${formData.turma}.`,
        };
      }

      const newReg: Registration = {
        id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        nome: trimmedName,
        turma: formData.turma as Turma,
        dataVisita: formData.dataVisita as DataVisita,
        createdAt: new Date().toISOString(),
      };

      let insRes = await supabase.from('registrations').insert([
        {
          id: newReg.id,
          nome: newReg.nome,
          turma: newReg.turma,
          dataVisita: newReg.dataVisita,
          createdAt: newReg.createdAt,
          data_visita: newReg.dataVisita,
          created_at: newReg.createdAt,
        },
      ]);

      if (insRes.error) {
        insRes = await supabase.from('registrations').insert([
          {
            id: newReg.id,
            nome: newReg.nome,
            turma: newReg.turma,
            data_visita: newReg.dataVisita,
            created_at: newReg.createdAt,
          },
        ]);
      }

      if (insRes.error) {
        return {
          success: false,
          error: 'Erro ao salvar inscrição no banco de dados. Tente novamente.',
        };
      }

      await fetchDirectFromSupabase();
      return {
        success: true,
        registration: newReg,
      };
    } catch (fallbackErr: any) {
      console.error('Direct Supabase registration error:', fallbackErr);
      return {
        success: false,
        error: 'Ocorreu um erro ao processar a inscrição. Tente novamente.',
      };
    }
  };

  // Handle delete registration
  const handleDeleteRegistration = async (id: string, adminPass?: string): Promise<boolean> => {
    const password = adminPass || '30012015';
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRegistrations(data.registrations || []);
          if (data.stats) setStats(data.stats);
          return true;
        }
      }
    } catch (err) {
      console.warn('API delete failed, trying direct Supabase delete...');
    }

    // Direct Supabase delete fallback
    try {
      await supabase.from('registrations').delete().eq('id', id);
      await fetchDirectFromSupabase();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Handle update registration
  const handleUpdateRegistration = async (
    id: string,
    updates: { dataVisita?: DataVisita; turma?: Turma; nome?: string },
    adminPass?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const password = adminPass || '30012015';
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...updates, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRegistrations(data.registrations || []);
          if (data.stats) setStats(data.stats);
          return { success: true };
        }
      }
    } catch (err) {
      console.warn('API update failed, trying direct Supabase update...');
    }

    // Direct Supabase update fallback
    try {
      await supabase.from('registrations').update({
        nome: updates.nome,
        turma: updates.turma,
        dataVisita: updates.dataVisita,
        data_visita: updates.dataVisita,
      }).eq('id', id);
      await fetchDirectFromSupabase();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Erro ao atualizar no banco de dados.' };
    }
  };

  // Handle reset registrations
  const handleResetData = async (adminPass?: string): Promise<boolean> => {
    const password = adminPass || '30012015';
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRegistrations([]);
          if (data.stats) setStats(data.stats);
          return true;
        }
      }
    } catch (err) {
      console.warn('API reset failed, trying direct Supabase reset...');
    }

    // Direct Supabase reset fallback
    try {
      await supabase.from('registrations').delete().neq('id', '0');
      await fetchDirectFromSupabase();
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
        totalRegistrations={stats.totalRegistrations}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold">Carregando sistema de vagas...</span>
          </div>
        ) : isAdminOpen ? (
          /* Admin Panel */
          <AdminPanel
            registrations={registrations}
            stats={stats}
            onDeleteRegistration={handleDeleteRegistration}
            onUpdateRegistration={handleUpdateRegistration}
            onRefreshData={fetchData}
            onResetData={handleResetData}
          />
        ) : (
          /* Student Registration View */
          <div className="space-y-8">
            {/* Top Cards showing capacities for 15/08 and 29/08 */}
            <section id="capacity-section" className="scroll-mt-6">
              <CapacityCards
                capacities={stats.capacities}
                selectedDate={selectedDateCard}
                onSelectDate={(d) => setSelectedDateCard(d)}
              />
            </section>

            {/* Registration Form */}
            <section id="form-section" className="scroll-mt-6">
              <RegistrationForm
                capacities={stats.capacities}
                onSubmit={handleRegister}
                selectedDateFromCard={selectedDateCard}
                onDateChange={(d) => setSelectedDateCard(d)}
              />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

