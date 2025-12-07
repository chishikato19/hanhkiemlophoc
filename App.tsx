import React, { useState } from 'react';
import Navigation from './components/Navigation';
import StudentManager from './components/StudentManager';
import ConductManager from './components/ConductManager';
import SeatingMap from './components/SeatingMap';
import Documentation from './components/Documentation';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('students');

  const renderContent = () => {
    switch (currentTab) {
      case 'students': return <StudentManager />;
      case 'conduct': return <ConductManager />;
      case 'seating': return <SeatingMap />;
      case 'docs': return <Documentation />;
      default: return <StudentManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navigation currentTab={currentTab} setTab={setCurrentTab} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;