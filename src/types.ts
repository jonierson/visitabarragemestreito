export type Turma = '3º BIOTEC' | '3º A INFO' | '3º B INFO';
export type DataVisita = '15/08' | '29/08';

export interface Registration {
  id: string;
  nome: string;
  turma: Turma;
  dataVisita: DataVisita;
  createdAt: string; // ISO String
}

export interface DateCapacity {
  dataVisita: DataVisita;
  totalLimit: number;
  occupied: number;
  available: number;
  isFull: boolean;
}

export interface VisitStats {
  capacities: Record<DataVisita, DateCapacity>;
  totalRegistrations: number;
  byTurma: Record<Turma, number>;
  byData: Record<DataVisita, number>;
}

export interface RegistrationFormData {
  nome: string;
  turma: Turma | '';
  dataVisita: DataVisita | '';
}

export interface RegisterResponse {
  success: boolean;
  registration?: Registration;
  stats?: VisitStats;
  error?: string;
}
