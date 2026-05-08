export type BillingInterval = 'month' | 'year';

export type AppPlan = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'brl';
  interval: BillingInterval;
  bullets: string[];
};

/**
 * Fonte de verdade dos planos.
 * - NÃO confie em preço vindo do client.
 * - Para adicionar novos planos no futuro, inclua aqui e atualize a UI.
 */
export const PLANS: AppPlan[] = [
  {
    id: 'mensal',
    name: 'Plano Mensal',
    description: 'Assinatura Mensal - Assefin',
    priceCents: 2990,
    currency: 'brl',
    interval: 'month',
    bullets: [
      'Acesso completo aos painéis',
      'Notícias e indicadores em tempo real',
      'Portfolio, risco e performance',
    ],
  },
];

export function getPlanById(planId: string): AppPlan | null {
  return PLANS.find((p) => p.id === planId) ?? null;
}

