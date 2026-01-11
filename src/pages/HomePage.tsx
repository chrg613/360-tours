import {
  HeroSection,
  SocialProofBar,
  AIShowcase,
  HowItWorks,
  FeaturesGrid,
  PricingSection,
  FinalCTA,
} from '@/components/landing';

export function HomePage() {
  return (
    <>
      {/* Hero Section - Full viewport with animated 360 demo */}
      <HeroSection />

      {/* Social Proof - Logo marquee */}
      <SocialProofBar />

      {/* AI Showcase - Bento grid of AI features */}
      <AIShowcase />

      {/* How It Works - 3-step process */}
      <HowItWorks />

      {/* Features Grid - All platform capabilities */}
      <FeaturesGrid />

      {/* Pricing - Free + Pro tiers */}
      <PricingSection />

      {/* Final CTA - Bold closing statement */}
      <FinalCTA />
    </>
  );
}
