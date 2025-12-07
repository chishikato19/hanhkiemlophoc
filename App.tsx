
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import StudentManager from './components/StudentManager';
import ConductManager from './components/ConductManager';
import SeatingMap from './components/SeatingMap';
import Documentation from './components/Documentation';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('students');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const renderContent = () => {
    switch (currentTab) {
      case 'students': return <StudentManager setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'conduct': return <ConductManager setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'seating': return <SeatingMap setHasUnsavedChanges={setHasUnsavedChanges} />;
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
