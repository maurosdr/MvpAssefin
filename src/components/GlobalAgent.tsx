'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import AgentSidebar, { AgentSkill } from '@/components/AgentSidebar';

function inferSkill(pathname: string): AgentSkill {
  if (pathname.startsWith('/crypto/')) return 'crypto';
  if (pathname.startsWith('/stocks/')) return 'equity';
  if (pathname.startsWith('/portfolio')) return 'portfolio';
  return 'portfolio';
}

export default function GlobalAgent() {
  const pathname = usePathname() || '/';

  const skill = useMemo(() => inferSkill(pathname), [pathname]);
  const meta = useMemo(() => {
    if (skill === 'crypto') {
      return { title: 'Analista Cripto', subtitle: 'Leitura do ativo e do mercado' };
    }
    if (skill === 'equity') {
      return { title: 'Analista de Ações', subtitle: 'Tese, riscos e valuation' };
    }
    return { title: 'Gestor de Carteira', subtitle: 'Diagnóstico e rebalanceamento' };
  }, [skill]);

  return (
    <AgentSidebar
      skill={skill}
      title={meta.title}
      subtitle={meta.subtitle}
      contextKey={pathname}
      context={{ pathname }}
    />
  );
}

