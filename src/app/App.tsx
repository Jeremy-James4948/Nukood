import React, { useState } from 'react';
import { FloatingNavigation } from '../components/layout/FloatingNavigation';
import { FloatingUtilities } from '../components/layout/FloatingUtilities';
import { HistoryView } from '../features/history/HistoryView';
import { ArchiveView } from '../features/archive/ArchiveView';
import { SplitExpensesView } from '../features/splits/SplitExpensesView';
import { DailyCardCarousel } from '../features/dashboard/DailyCardCarousel';
import { CycleEndingBanner } from '../features/dashboard/CycleEndingBanner';
import { SnapshotWidget } from '../features/snapshot/SnapshotWidget';
import { FinancialEngineProvider, useFinancialEngine } from '../context/FinancialEngineContext';
import { TemplateService } from '../services/template.service';
import { ThemeEffectsLayer } from '../components/layout/ThemeEffectsLayer';
import { Users } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('nukood_active_tab') || 'Journal';
  });
  const { activeScope } = useFinancialEngine();

  React.useEffect(() => {
    localStorage.setItem('nukood_active_tab', activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    TemplateService.syncGlobalTemplates().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-sans antialiased selection:bg-accent selection:text-accent-foreground text-foreground">
        {/* Mobile Device Simulation Container */}
        <div className="w-full max-w-[428px] h-full sm:h-[926px] bg-background sm:rounded-[3rem] sm:shadow-neu-outer relative overflow-hidden flex flex-col transform-gpu">
          
          <ThemeEffectsLayer />
          {/* Top Fade Mask for Scrolling Content */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-background z-30 pointer-events-none" />
          <div className="absolute top-24 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-30 pointer-events-none" />
          
          {/* Floating Utilities */}
          <FloatingUtilities />

          {/* Floating Navigation */}
          <FloatingNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto hide-scrollbar pt-32 pb-24 flex flex-col gap-10">
            {activeTab === 'History' && <HistoryView />}
            {activeTab === 'Journal' && (
              <>
                <CycleEndingBanner />
                <DailyCardCarousel />
                <div className="px-6 pb-12">
                  <SnapshotWidget />
                </div>
              </>
            )}
            {activeTab === 'Splits' && <SplitExpensesView />}
            {activeTab === 'Archive' && <ArchiveView />}
          </main>
        </div>
      </div>
  );
}

export default function App() {
  return (
    <FinancialEngineProvider>
      <AppContent />
    </FinancialEngineProvider>
  );
}
