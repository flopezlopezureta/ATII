import React, { useState, useEffect } from 'react';
import PersonForm from './PersonForm.tsx';
import VehicleForm from './VehicleForm.tsx';
import { CondominiumEntry, SessionUser, AppSettings, DirectoryUser } from '../types.ts';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';

interface VisitRegistrationScreenProps {
  entries: CondominiumEntry[];
  onEntryAdded: (newEntries: CondominiumEntry[]) => void;
  currentUser: SessionUser;
  appSettings: AppSettings;
  userProfile: (DirectoryUser & { isSuperuser?: boolean }) | null;
  invitationIdToProcess?: string | null;
  onInvitationProcessed?: () => void;
  initialVisitType?: 'person' | 'vehicle';
}

const VisitRegistrationScreen: React.FC<VisitRegistrationScreenProps> = ({
  entries,
  onEntryAdded,
  currentUser,
  appSettings,
  userProfile,
  invitationIdToProcess,
  onInvitationProcessed,
  initialVisitType = 'person'
}) => {
  const [activeForm, setActiveForm] = useState<'person' | 'vehicle'>(initialVisitType);

  // If the initial type from props changes (e.g., processing a new invitation), update the active form.
  useEffect(() => {
    setActiveForm(initialVisitType);
  }, [initialVisitType]);


  const TabButton: React.FC<{
    formType: 'person' | 'vehicle';
    children: React.ReactNode;
  }> = ({ formType, children }) => (
    <button
      onClick={() => {
        if (activeForm !== formType) {
          setActiveForm(formType);
          // When manually switching tabs, we are no longer processing an invitation from another tab
          if(onInvitationProcessed) onInvitationProcessed();
        }
      }}
      className={`flex-1 py-3 px-4 text-center font-semibold rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
        activeForm === formType
          ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
      role="tab"
      aria-selected={activeForm === formType}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex bg-slate-100 rounded-t-lg shadow-inner" role="tablist">
        <TabButton formType="person">
            <div className="flex items-center justify-center space-x-2">
                <UserIcon className="w-5 h-5"/>
                <span>Registrar Persona</span>
            </div>
        </TabButton>
        <TabButton formType="vehicle">
             <div className="flex items-center justify-center space-x-2">
                <TruckIcon className="w-5 h-5"/>
                <span>Registrar Vehículo</span>
            </div>
        </TabButton>
      </div>
      
      <div>
        {activeForm === 'person' ? (
          <PersonForm
            onEntryAdded={onEntryAdded}
            currentUser={currentUser}
            appSettings={appSettings}
            userProfile={userProfile}
            invitationIdToProcess={invitationIdToProcess && activeForm === 'person' ? invitationIdToProcess : null}
            onInvitationProcessed={onInvitationProcessed}
          />
        ) : (
          <VehicleForm
            entries={entries}
            onEntryAdded={onEntryAdded}
            currentUser={currentUser}
            appSettings={appSettings}
            userProfile={userProfile}
            invitationIdToProcess={invitationIdToProcess && activeForm === 'vehicle' ? invitationIdToProcess : null}
            onInvitationProcessed={onInvitationProcessed}
          />
        )}
      </div>
    </div>
  );
};

export default VisitRegistrationScreen;
