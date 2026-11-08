import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { CreateCaseModal } from '../components/cases/CreateCaseModal';
import { api } from '../services/api';
import { CaseCreatePayload } from '../types';

export const RootLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateCase = async (payload: CaseCreatePayload) => {
    const newCase = await api.createCase(payload);
    navigate(`/cases/${newCase.case_id}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          onOpenCreateCase={() => setCreateCaseOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ openCreateCaseModal: () => setCreateCaseOpen(true) }} />
        </main>
      </div>

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={createCaseOpen}
        onClose={() => setCreateCaseOpen(false)}
        onSubmit={handleCreateCase}
      />
    </div>
  );
};
