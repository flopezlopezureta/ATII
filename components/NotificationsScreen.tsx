import React, { useState, useMemo } from 'react';
import { SessionUser, DirectoryUser, Notification, NotificationType, NotificationStatus } from '../types.ts';
import { getDirectoryUsers } from '../services/directoryService.ts';
import { getNotifications, addNotification, updateNotification } from '../services/notificationService.ts';
import BellIcon from './icons/BellIcon.tsx';
import PackageIcon from './icons/PackageIcon.tsx';
import FoodIcon from './icons/FoodIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';

interface NotificationsScreenProps {
  currentUser: SessionUser;
  onNotificationsUpdated: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ currentUser, onNotificationsUpdated }) => {
  const [allDirectoryUsers] = useState<DirectoryUser[]>(getDirectoryUsers());
  const [allNotifications, setAllNotifications] = useState<Notification[]>(getNotifications());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const [deliveryType, setDeliveryType] = useState<NotificationType>(NotificationType.PACKAGE);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };
  
  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return allDirectoryUsers.filter(user => 
      user.name.toLowerCase().includes(lowerTerm) || 
      user.apartment?.toLowerCase().includes(lowerTerm)
    ).slice(0, 5);
  }, [searchTerm, allDirectoryUsers]);

  const handleSelectUser = (user: DirectoryUser) => {
    setSelectedUser(user);
    setSearchTerm(`${user.name} (${user.apartment})`);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      showFeedback('error', 'Por favor, seleccione un residente destinatario.');
      return;
    }

    addNotification({
      recipientDirUserId: selectedUser.id,
      recipientName: selectedUser.name,
      recipientApt: selectedUser.apartment || 'N/A',
      type: deliveryType,
      notes: notes,
      createdByUsername: currentUser.username,
    });

    showFeedback('success', `Notificación enviada a ${selectedUser.name}.`);
    setAllNotifications(getNotifications());
    onNotificationsUpdated();
    
    // Reset form
    clearSelection();
    setNotes('');
    setDeliveryType(NotificationType.PACKAGE);
  };

  const handleMarkAsDelivered = (notificationId: string) => {
    updateNotification(notificationId, { 
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date().toISOString()
    });
    setAllNotifications(getNotifications());
    onNotificationsUpdated();
    showFeedback('success', 'Notificación marcada como entregada.');
  };

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(n => n.status === (activeTab === 'pending' ? NotificationStatus.PENDING : NotificationStatus.DELIVERED));
  }, [allNotifications, activeTab]);

  return (
    <div className="space-y-8">
      {/* Notification Form */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-center space-x-3 text-center mb-8">
          <BellIcon className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-slate-800">Notificar Entrega</h2>
        </div>
        
        {feedback && (
          <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="residentSearch" className="block text-sm font-medium text-slate-700 mb-1">Buscar Residente (por Nombre o Apto) <span className="text-red-500">*</span></label>
            <div className="relative">
              <input 
                type="text" 
                id="residentSearch" 
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  if (selectedUser) setSelectedUser(null);
                }}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm"
                placeholder="Ej: Juan Pérez o D-201"
                autoComplete="off"
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5"/>
            </div>
            {searchTerm && !selectedUser && searchResults.length > 0 && (
              <ul className="border border-slate-300 rounded-md mt-1 max-h-40 overflow-y-auto bg-white shadow-lg z-10">
                {searchResults.map(user => (
                  <li key={user.id} onClick={() => handleSelectUser(user)} className="p-2 hover:bg-indigo-50 cursor-pointer text-sm">
                    {user.name} ({user.apartment})
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Entrega</label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-50">
                <input type="radio" name="deliveryType" value={NotificationType.PACKAGE} checked={deliveryType === NotificationType.PACKAGE} onChange={() => setDeliveryType(NotificationType.PACKAGE)} className="h-4 w-4 text-indigo-600"/>
                <PackageIcon className="w-5 h-5 text-slate-600"/>
                <span>Encomienda</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-50">
                <input type="radio" name="deliveryType" value={NotificationType.FOOD} checked={deliveryType === NotificationType.FOOD} onChange={() => setDeliveryType(NotificationType.FOOD)} className="h-4 w-4 text-indigo-600"/>
                <FoodIcon className="w-5 h-5 text-slate-600"/>
                <span>Pedido de Comida</span>
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-4 py-3 border border-slate-300 rounded-lg" placeholder="Ej: Caja de MercadoLibre, pedido de Uber Eats..."></textarea>
          </div>
          
          <button type="submit" disabled={!selectedUser} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md disabled:opacity-50">
            Enviar Notificación
          </button>
        </form>
      </div>

      {/* Notifications List */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">Historial de Notificaciones</h3>
        <div className="border-b border-slate-200 mb-4">
          <nav className="-mb-px flex space-x-6">
            <button onClick={() => setActiveTab('pending')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Pendientes de Retiro
            </button>
            <button onClick={() => setActiveTab('delivered')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'delivered' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Entregadas
            </button>
          </nav>
        </div>
        
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {filteredNotifications.length > 0 ? filteredNotifications.map(n => (
            <div key={n.id} className="bg-slate-50 p-3 rounded-lg border flex flex-col sm:flex-row items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  {n.type === NotificationType.PACKAGE ? <PackageIcon className="w-6 h-6 text-sky-600"/> : <FoodIcon className="w-6 h-6 text-orange-500"/>}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{n.recipientName} <span className="text-slate-500 font-normal">({n.recipientApt})</span></p>
                  <p className="text-sm text-slate-600">{n.notes || 'Sin notas.'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Notificado por {n.createdByUsername} el {new Date(n.createdAt).toLocaleString('es-CL')}
                  </p>
                  {n.status === NotificationStatus.ACKNOWLEDGED && <p className="text-xs text-green-600 mt-0.5">Residente enterado el {new Date(n.acknowledgedAt!).toLocaleString('es-CL')}</p>}
                </div>
              </div>
              {activeTab === 'pending' && (
                <button onClick={() => handleMarkAsDelivered(n.id)} className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md shadow-sm">
                  Marcar como Entregado
                </button>
              )}
            </div>
          )) : (
            <p className="text-center text-slate-500 py-8">No hay notificaciones en esta categoría.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsScreen;
