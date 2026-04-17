// charlie-live/app/page.tsx
'use client';

import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { LandingPage } from '../components/layout/LandingPage';
import { DueDiligence } from '../components/usecases/DueDiligence';
import { KYC } from '../components/usecases/KYC';
import { Signaux } from '../components/usecases/Signaux';
import { Surveillance } from '../components/usecases/Surveillance';
import { BriefRDV } from '../components/usecases/BriefRDV';
import type { UseCase } from '../types';

export default function Home() {
  const [activeUseCase, setActiveUseCase] = useState<UseCase>('landing');

  return (
    <div className="flex flex-col min-h-full">
      <Header active={activeUseCase} onNavigate={setActiveUseCase} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        {activeUseCase === 'landing' && <LandingPage onSelect={setActiveUseCase} />}
        {activeUseCase === 'due-diligence' && <DueDiligence />}
        {activeUseCase === 'brief-rdv' && <BriefRDV />}
        {activeUseCase === 'kyc' && <KYC />}
        {activeUseCase === 'signaux' && <Signaux />}
        {activeUseCase === 'surveillance' && <Surveillance />}
      </main>
    </div>
  );
}
