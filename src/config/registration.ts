import { KeyboardMode } from '../components/AppKeyboard';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldMask = 'cpf' | 'phone';

export type FieldConfig = {
  id: string;
  label: string;
  placeholder: string;
  mode: KeyboardMode;
  required: boolean;
  /** Apply a built-in input mask. Only valid when mode is 'numeric'. */
  mask?: FieldMask;
  /** If true, duplicate submissions with the same value are blocked. */
  unique?: boolean;
  /** Returns an error message string, or null if valid. */
  validate?: (value: string) => string | null;
};

// ─── Masks ────────────────────────────────────────────────────────────────────

function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const MASKS: Record<FieldMask, (raw: string) => string> = {
  cpf: maskCPF,
  phone: maskPhone,
};

// ─── Fields ───────────────────────────────────────────────────────────────────
// Edit this array to add, remove, or reorder fields for each client deployment.
// The order here is the order they appear in the form and in the admin panel.

export const REGISTRATION_FIELDS: FieldConfig[] = [
  {
    id: 'name',
    label: 'Primeiro Nome',
    placeholder: 'Primeiro Nome',
    mode: 'alpha',
    required: true,
    validate: (v) => (!v.trim() ? 'Nome obrigatório' : null),
  },
  {
    id: 'surname',
    label: 'Sobrenome',
    placeholder: 'Sobrenome',
    mode: 'alpha',
    required: true,
    validate: (v) => (!v.trim() ? 'Sobrenome obrigatório' : null),
  },
  {
    id: 'cpf',
    label: 'CPF',
    placeholder: '000.000.000-00',
    mode: 'numeric',
    required: true,
    mask: 'cpf',
    unique: true,
    validate: (v) => (v.replace(/\D/g, '').length !== 11 ? 'CPF inválido' : null),
  },
  {
    id: 'email',
    label: 'E-mail',
    placeholder: 'seu@email.com',
    mode: 'alpha',
    required: true,
    validate: (v) =>
      !v.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'E-mail inválido' : null,
  },
  {
    id: 'phone',
    label: 'Telefone',
    placeholder: '11 99999-9999',
    mode: 'numeric',
    required: true,
    mask: 'phone',
    validate: (v) => (v.replace(/\D/g, '').length < 10 ? 'Telefone inválido' : null),
  },
];
