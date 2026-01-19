import { Hero } from '@/components/landing/Hero';
import { Problem } from '@/components/landing/Problem';
import { Solution } from '@/components/landing/Solution';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Vision } from '@/components/landing/Vision';
import { FinalCTA } from '@/components/landing/FinalCTA';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <Vision />
      <FinalCTA />
    </main>
  );
}
