
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import StudentManager from './components/StudentManager';
import ConductManager from './components/ConductManager';
import SeatingMap from './components/SeatingMap';
import StoreManager from './components/StoreManager';
import FundManager from './components/FundManager';
import Documentation from './components/Documentation';
import LoginGate from './components/LoginGate';
import StudentPortal from './components/StudentPortal';
import InboxManager from './components/InboxManager';
import { getSettings } from './services/dataService';

const App: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [currentTab, setCurrentTab] = useState('students');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const settings = getSettings();

  // Warn on page reload/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!role) {
      return <LoginGate settings={settings} onLoginSuccess={setRole} />;
  }

  if (role === 'student') {
      return <StudentPortal />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'students': return <StudentManager setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'conduct': return <ConductManager setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'seating': return <SeatingMap setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'fund': return <FundManager />;
      case 'store': return <StoreManager />;
      case 'inbox': return (
        <div className="max-w-7xl mx-auto py-6 px-4">
             <InboxManager />
        </div>
      );
      case 'docs': return <Documentation />;
      default: return <StudentManager setHasUnsavedChanges={setHasUnsavedChanges} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navigation 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
