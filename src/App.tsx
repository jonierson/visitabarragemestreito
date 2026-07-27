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
import { Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedDateCard, setSelectedDateCard] = useState<DataVisita | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<VisitStats>({
    capacities: {
      '15/08': {
        dataVisita: '15/08',
        totalLimit: 38,
        occupied: 0,
        available: 38,
        isFull: false,
      },
      '29/08': {
        dataVisita: '29/08',
        totalLimit: 38,
        occupied: 0,
        available: 38,
        isFull: false,
      },
    },
    totalRegistrations: 0,
    byTurma: {
      '3º BIOTEC': 0,
      '3º A INFO': 0,
      '3º B INFO': 0,
    },
    byData: {
      '15/08': 0,
      '29/08': 0,
    },
  });

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic polling for real-time updates
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 4000); // Poll every 4 seconds to simulate real-time updates
    return () => clearInterval(interval);
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
        console.error('Failed to parse JSON response:', parseErr);
      }

      if (res.ok && data.success) {
        if (data.stats) setStats(data.stats);
        // Refresh local list
        await fetchData();
        return {
          success: true,
          registration: data.registration,
        };
      } else {
        return {
          success: false,
          error: data.error || `Ocorreu um erro no servidor (código ${res.status}). Tente novamente.`,
        };
      }
    } catch (err) {
      console.error('Registration submission fetch error:', err);
      return {
        success: false,
        error: 'Falha na conexão com o servidor. Verifique sua rede e tente novamente.',
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

      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations(data.registrations || []);
        if (data.stats) setStats(data.stats);
        return true;
      } else {
        console.error('Delete registration response error:', data);
      }
    } catch (err) {
      console.error('Error deleting registration:', err);
    }
    return false;
  };

  // Handle update registration (e.g., change visit date or turma)
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

      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations(data.registrations || []);
        if (data.stats) setStats(data.stats);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erro ao atualizar inscrição.' };
      }
    } catch (err) {
      console.error('Error updating registration:', err);
      return { success: false, error: 'Erro de conexão com o servidor.' };
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

      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations([]);
        if (data.stats) setStats(data.stats);
        return true;
      }
    } catch (err) {
      console.error('Error resetting data:', err);
    }
    return false;
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
