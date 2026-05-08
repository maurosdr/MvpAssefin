import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import Footer from '@/components/Footer';
import { ArrowRight, Brain, CandlestickChart, Lock, Newspaper, Sparkles } from 'lucide-react';

export default function Home() {
  const quickLinks = [
    { title: 'Cripto em tempo real', desc: 'Preços, métricas e notícias relevantes.', href: '/crypto', icon: CandlestickChart },
    { title: 'Ações e índices', desc: 'Leitura rápida do mercado global.', href: '/stocks', icon: Newspaper },
    { title: 'Portfolio', desc: 'Acompanhe risco, exposição e performance.', href: '/portfolio', icon: Brain },
  ] as const;

  const valueProps = [
    {
      title: 'Visão Bloomberg, execução moderna',
      desc: 'Dados, contexto e narrativa — na mesma tela, com foco em clareza e velocidade.',
      icon: Sparkles,
    },
    {
      title: 'Camadas de segurança',
      desc: 'Estrutura pensada para operar com chaves, permissões e acessos de forma responsável.',
      icon: Lock,
    },
    {
      title: 'Automação com “agentic workflow”',
      desc: 'Da ideia à ação: alertas, rotinas e análise assistida para decisões com menos ruído.',
      icon: Brain,
    },
    {
      title: 'Sinais que viram decisão',
      desc: 'Tendência, volatilidade e contexto — para transformar movimento em tese (e tese em ação).',
      icon: CandlestickChart,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[42rem] rounded-full bg-[var(--accent-soft)] blur-3xl" />
            <div className="absolute -bottom-32 right-[-8rem] h-80 w-80 rounded-full bg-[var(--info-soft)] blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-[140px] pb-10 sm:pb-16 relative">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                  Inteligência de mercado, do sinal ao contexto
                </div>

                <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight text-[var(--text-primary)] text-balance">
                  Um cockpit de mercado para quem precisa decidir rápido — e bem.
                </h1>
                <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Centralize macro, cripto, ações e portfolio em uma experiência limpa, profissional e orientada a ação.
                  Menos abas. Mais convicção.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Link
                    href="/subscription"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--text-inverse)] font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-md"
                  >
                    Quero acesso
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/crypto"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Explorar painéis
                    <CandlestickChart className="w-5 h-5 text-[var(--text-secondary)]" />
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
                  <div className="modern-card p-4">
                    <div className="text-xs text-[var(--text-muted)] font-semibold">Sinais</div>
                    <div className="mt-1 text-lg font-black data-value">+ contexto</div>
                  </div>
                  <div className="modern-card p-4">
                    <div className="text-xs text-[var(--text-muted)] font-semibold">Risco</div>
                    <div className="mt-1 text-lg font-black data-value">visível</div>
                  </div>
                  <div className="modern-card p-4">
                    <div className="text-xs text-[var(--text-muted)] font-semibold">Rotinas</div>
                    <div className="mt-1 text-lg font-black data-value">agentic</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative">
                  <div className="gradient-border">
                    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-soft)] via-transparent to-[var(--info-soft)] opacity-80" />

                      <div className="relative p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold tracking-[0.2em] uppercase text-[var(--accent)]">
                            overview
                          </div>
                          <div className="text-xs font-semibold text-[var(--text-muted)]">Atualizações contínuas</div>
                        </div>

                        <div className="mt-4 grid grid-cols-12 gap-4">
                          <div className="col-span-12">
                            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm">
                              <div className="aspect-[16/10] sm:aspect-[16/9]">
                                <Image
                                  src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80"
                                  alt="Painel de mercados (imagem ilustrativa)"
                                  fill
                                  sizes="(max-width: 1024px) 100vw, 50vw"
                                  className="object-cover"
                                  priority
                                />
                              </div>
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

                              <div className="absolute bottom-4 left-4 right-4">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-black/35 backdrop-blur-md px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">
                                      Macro
                                    </div>
                                    <div className="mt-1 text-sm font-extrabold text-white">Nítido</div>
                                  </div>
                                  <div className="rounded-xl border border-white/10 bg-black/35 backdrop-blur-md px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">
                                      Crypto
                                    </div>
                                    <div className="mt-1 text-sm font-extrabold text-white">Rápido</div>
                                  </div>
                                  <div className="rounded-xl border border-white/10 bg-black/35 backdrop-blur-md px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">
                                      Risco
                                    </div>
                                    <div className="mt-1 text-sm font-extrabold text-white">Controlado</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-6">
                            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
                              <div className="aspect-[4/3]">
                                <Image
                                  src="https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80"
                                  alt="Análise e decisão (imagem ilustrativa)"
                                  fill
                                  sizes="(max-width: 1024px) 100vw, 25vw"
                                  className="object-cover"
                                />
                              </div>
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/0" />
                              <div className="absolute bottom-3 left-3 right-3">
                                <div className="text-sm font-extrabold text-white">Insights que viram rotina</div>
                                <div className="mt-0.5 text-xs text-white/75">
                                  Seu fluxo diário, com menos fricção e mais consistência.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-6">
                            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-11 h-11 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center">
                                  <Brain className="w-5 h-5 text-[var(--accent)]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-[var(--text-primary)]">Modo agentico</div>
                                  <div className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                                    Automação, alertas e interpretação — sem perder o controle da tese.
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                                    Alertas
                                  </div>
                                  <div className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">com tese</div>
                                </div>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
                                    Rotinas
                                  </div>
                                  <div className="mt-1 text-sm font-extrabold text-[var(--text-primary)]">replicáveis</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid md:grid-cols-3 gap-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="modern-card card-hover group">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-extrabold text-[var(--text-primary)]">{item.title}</div>
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <div className="section-title">proposta</div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Seu stack de investimento com padrão institucional.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Um lugar para ler mercado, organizar decisões e monitorar risco — com estética sóbria e usabilidade de
                produto profissional.
              </p>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {valueProps.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="modern-card">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[var(--text-primary)]" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[var(--text-primary)]">{v.title}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{v.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--info-soft)]" />
            <div className="relative p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="section-title">destaque</div>
                  <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)] text-balance">
                    <span className="bg-[var(--accent-soft)] px-2 py-1 rounded-lg border border-[var(--border)]">
                      Seu próprio fundo de investimento agêntico
                    </span>
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    Estruture tese, defina regras, monitore risco e transforme sinais em execução consistente — com uma
                    experiência que parece “produto de mesa”.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/subscription"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--text-inverse)] font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-md"
                  >
                    Ver planos
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/markets"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Ver mercados
                    <Newspaper className="w-5 h-5 text-[var(--text-secondary)]" />
                  </Link>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Rotina
                  </div>
                  <div className="mt-1 text-base font-extrabold text-[var(--text-primary)]">
                    Checklist + alertas
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    Mantenha disciplina sem engessar o raciocínio.
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Risco
                  </div>
                  <div className="mt-1 text-base font-extrabold text-[var(--text-primary)]">
                    Exposição e limites
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    Veja o que importa antes do mercado te cobrar.
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Contexto
                  </div>
                  <div className="mt-1 text-base font-extrabold text-[var(--text-primary)]">
                    Macro + narrativa
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    Leia o cenário sem depender de dezenas de fontes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6">
              <div className="section-title">como funciona</div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Do painel ao processo — sem perder elegância.
              </h2>
              <div className="mt-6 space-y-3">
                <div className="modern-card">
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">1) Colete sinais</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">
                    Acompanhe preços, indicadores e notícias com uma leitura rápida e consistente.
                  </div>
                </div>
                <div className="modern-card">
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">2) Dê contexto</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">
                    Transforme dados em entendimento com agregação e organização visual.
                  </div>
                </div>
                <div className="modern-card">
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">3) Execute e monitore</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">
                    Faça o básico muito bem: risco, exposição, e consistência na tomada de decisão.
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 h-full">
              <div className="grid grid-cols-1 h-full">
                <div className="modern-card p-0 overflow-hidden h-full">
                  <div className="relative h-full min-h-[280px]">
                    <Image
                      src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=2000&q=80"
                      alt="Gráfico e tela de mercado (imagem ilustrativa)"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover object-center"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/0" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="max-w-md rounded-2xl border border-white/10 bg-black/35 backdrop-blur-md px-4 py-3 shadow-sm">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/75 font-extrabold">
                          leitura de mercado
                        </div>
                        <div className="mt-1 text-base sm:text-lg font-black text-white leading-snug text-balance">
                          “O que subiu é o preço. O que importa é o porquê.”
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90">
                            B3
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90">
                            contexto
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/90">
                            risco
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            <div className="grid lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 p-6 sm:p-10">
                <div className="section-title">pronto pra começar?</div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  Tenha um centro de comando com cara de produto.
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Acesse os painéis, organize seu portfolio e evolua seu processo de decisão com um fluxo mais limpo e
                  consistente.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/subscription"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--text-inverse)] font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-md"
                  >
                    Começar agora
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/crypto"
                    className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Ver demo
                    <CandlestickChart className="w-5 h-5 text-[var(--text-secondary)]" />
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5 relative min-h-[220px]">
                <Image
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80"
                  alt="Ambiente corporativo (imagem ilustrativa)"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/30 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
