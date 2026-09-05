import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { HeroSection } from '@/components/marketing/HeroSection';
import { ServicesSection } from '@/components/marketing/ServicesSection';
import { IndustriesSection } from '@/components/marketing/IndustriesSection';
import { WhyAdparlorr } from '@/components/marketing/WhyAdparlorr';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { CTASection } from '@/components/marketing/CTASection';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MarketingNavbar />
      <HeroSection />
      <ServicesSection />
      <IndustriesSection />
      <WhyAdparlorr />
      <HowItWorks />
      <CTASection />
      <MarketingFooter />
    </div>
  );
}
