import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { useInView } from '@/components/animations';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

const plans = [
  {
    id: 'free',
    name: 'Free',
    badge: 'Most Popular',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started',
    features: [
      'Unlimited tours',
      'Up to 50 scenes per tour',
      'Basic analytics',
      '5 AI analyses per month',
      'Standard branding',
      'Public sharing & embedding',
      'Community support',
    ],
    cta: 'Start Free',
    ctaLink: ROUTES.REGISTER,
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'For Teams',
    price: 'Usage-based',
    period: 'scales with your needs',
    description: 'Advanced features for professionals',
    features: [
      'Everything in Free, plus:',
      'Unlimited AI analyses',
      'White-label branding',
      'Custom domains',
      'Advanced analytics & heatmaps',
      'Priority support',
      'API access',
      'Team collaboration',
    ],
    cta: 'Contact Sales',
    ctaLink: '#contact',
    highlighted: false,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { threshold: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="landing-section bg-[var(--landing-bg)]"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div
          className={cn(
            'text-center max-w-2xl mx-auto',
            isInView && 'landing-animate-fade-in-up'
          )}
        >
          <span className="landing-eyebrow">Pricing</span>
          <h2 className="mt-4 landing-headline text-[clamp(2rem,4vw,3rem)]">
            Simple pricing that
            <br />
            <span className="landing-accent-text">scales with you</span>
          </h2>
          <p className="mt-4 landing-body text-lg">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 md:mt-16 grid md:grid-cols-2 gap-6 md:gap-8 items-start">
          {plans.map((plan, idx) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-3xl p-8 md:p-10',
                plan.highlighted
                  ? 'bg-white dark:bg-[#111111] border-2 border-[var(--landing-accent)] shadow-xl shadow-[var(--landing-accent)]/10'
                  : 'bg-[var(--landing-bg-dark)] text-white border border-white/10',
                isInView && 'landing-animate-fade-in-up'
              )}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {/* Badge */}
              <span
                className={cn(
                  'inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider',
                  plan.highlighted
                    ? 'bg-[var(--landing-accent-subtle)] text-[var(--landing-accent)]'
                    : 'bg-white/10 text-white/70'
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {plan.badge}
              </span>

              {/* Plan name */}
              <h3 className={cn(
                'mt-4 landing-headline text-2xl',
                !plan.highlighted && 'text-white'
              )}>
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-5xl font-bold',
                    plan.highlighted ? 'text-[var(--landing-text-hero)]' : 'text-white'
                  )}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {plan.price}
                </span>
                <span
                  className={cn(
                    'text-sm',
                    plan.highlighted ? 'text-[var(--landing-text-muted)]' : 'text-white/50'
                  )}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {plan.period}
                </span>
              </div>

              {/* Description */}
              <p
                className={cn(
                  'mt-4 text-sm',
                  plan.highlighted ? 'text-[var(--landing-text-body)]' : 'text-white/60'
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {plan.description}
              </p>

              {/* Features list */}
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, featureIdx) => (
                  <li
                    key={featureIdx}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                        plan.highlighted
                          ? 'bg-[var(--landing-accent-subtle)]'
                          : 'bg-white/10'
                      )}
                    >
                      <Check
                        className={cn(
                          'w-3 h-3',
                          plan.highlighted ? 'text-[var(--landing-accent)]' : 'text-white/70'
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        plan.highlighted ? 'text-[var(--landing-text-body)]' : 'text-white/70'
                      )}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.highlighted ? (
                <Link
                  to={plan.ctaLink}
                  className="mt-8 w-full landing-btn-primary justify-center group"
                >
                  {plan.cta}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <a
                  href={plan.ctaLink}
                  className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-[var(--landing-bg-dark)] font-semibold rounded-full hover:-translate-y-0.5 transition-all duration-200"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {plan.cta}
                  <ArrowRight className="w-5 h-5" />
                </a>
              )}

              {!plan.highlighted && (
                <p
                  className="mt-4 text-center text-xs text-white/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Talk to us about volume pricing
                </p>
              )}

              {/* Decorative glow for highlighted card */}
              {plan.highlighted && (
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[var(--landing-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
