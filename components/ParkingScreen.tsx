
import React, { useState, useMemo } from 'react';
import { getDirectoryUsers } from '../services/directoryService.ts';
import { getEntries } from '../services/storageService.ts';
import { EntryType, VehicleEntry, AppSettings } from '../types.ts';
import ParkingIcon from './icons/ParkingIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';

interface ParkingScreenProps {
  appSettings: AppSettings;
}

const ParkingScreen: React.FC<ParkingScreenProps> = ({ appSettings }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const parkingData = useMemo(() => {
        const users = getDirectoryUsers();
        const vehicleEntries = getEntries().filter(e => e.type === EntryType.VEHICLE) as VehicleEntry[];

        const totalSpots = appSettings.totalParkingSpots || 0;
        if (totalSpots === 0) {
            return [];
        }

        const allSpots = Array.from({ length: totalSpots }, (_, i) => (i + 1).toString());

        const spotMap = new Map<string, { id: string; owner: any; status: string; occupant: any; }>();

        // 1. Assign owners from all sources (unit and vehicles)
        for (const user of users) {
            const userSpots = new Set<string>();

            // Add spots from the unit
            if (user.unitParkingSpots) {
                for (const spot of user.unitParkingSpots) {
                    if(spot) userSpots.add(spot);
                }
            }

            // Add spots from vehicles
            for (const vehicle of user.vehicles) {
                if (vehicle.parkingSpot) {
                    userSpots.add(vehicle.parkingSpot);
                }
            }
            
            // Now set them in the map
            for (const spot of userSpots) {
                if (!spotMap.has(spot)) {
                    spotMap.set(spot, { id: spot, owner: user, status: 'available', occupant: null });
                }
            }
        }
        
        // 2. Check for visitor occupation
        const activeVehicleEntries = vehicleEntries.filter(e => e.parkingSpot); // Consider only entries with a parking spot
        for (const entry of activeVehicleEntries) {
            if (entry.parkingSpot && spotMap.has(entry.parkingSpot)) {
                const spotInfo = spotMap.get(entry.parkingSpot);
                if (spotInfo && spotInfo.status === 'available') { 
                    spotInfo.status = 'visitor';
                    spotInfo.occupant = { type: 'Visita', name: entry.driverName, licensePlate: entry.licensePlate };
                }
            }
        }
        
        // 3. Check for resident vehicle occupation
         for (const user of users) {
            for (const vehicle of user.vehicles) {
                if (vehicle.parkingSpot && spotMap.has(vehicle.parkingSpot)) {
                    const spotInfo = spotMap.get(vehicle.parkingSpot);
                     if (spotInfo && spotInfo.status === 'available') {
                        spotInfo.status = 'resident';
                        spotInfo.occupant = { type: 'Residente', name: user.name, licensePlate: vehicle.licensePlate };
                     }
                }
            }
        }


        // 4. Fill in spots defined in settings but not assigned to anyone
        for (const spotId of allSpots) {
            if (!spotMap.has(spotId)) {
                spotMap.set(spotId, { id: spotId, owner: null, status: 'unassigned', occupant: null });
            }
        }
        
        // Convert map to array and sort numerically/alphanumerically
        return Array.from(spotMap.values()).sort((a, b) => {
             const numA = parseInt(a.id, 10);
             const numB = parseInt(b.id, 10);
             if (!isNaN(numA) && !isNaN(numB)) {
                 return numA - numB;
             }
             return a.id.localeCompare(b.id);
        });
    }, [appSettings.totalParkingSpots]);

    const filteredSpots = useMemo(() => {
        if (!searchTerm) return parkingData;
        const lowerTerm = searchTerm.toLowerCase();
        return parkingData.filter(spot => 
            spot.id.toLowerCase().includes(lowerTerm) ||
            spot.owner?.name.toLowerCase().includes(lowerTerm) ||
            spot.owner?.apartment?.toLowerCase().includes(lowerTerm) ||
            spot.occupant?.licensePlate?.toLowerCase().includes(lowerTerm)
        );
    }, [parkingData, searchTerm]);
    
    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'visitor': return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
            case 'resident': return { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' };
            case 'available': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
            case 'unassigned':
            default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };
        }
    };
    
    const getStatusText = (status: string) => {
        switch (status) {
            case 'visitor': return 'Ocupado: Visita';
            case 'resident': return 'Asignado';
            case 'available': return 'Asignado';
            case 'unassigned': return 'No Asignado';
            default: return 'Desconocido';
        }
    };


    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                    <ParkingIcon className="w-8 h-8 text-slate-700" />
                    <h2 className="text-3xl font-bold text-slate-800">Estado de Estacionamientos</h2>
                </div>
            </div>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Buscar por N°, propietario, apto, patente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm"
                />
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>

            {parkingData.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-slate-500">No hay estacionamientos configurados.</p>
                    <p className="text-sm text-slate-400 mt-2">El superusuario puede configurar el número total de estacionamientos en Ajustes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredSpots.map(spot => {
                        const classes = getStatusClasses(spot.status);
                        return (
                            <div key={spot.id} className={`p-3 rounded-lg border-2 ${classes.border} ${classes.bg} flex flex-col justify-between`}>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-lg text-slate-800">{spot.id}</h4>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${classes.bg} ${classes.text}`}>{getStatusText(spot.status)}</span>
                                    </div>
                                    <div className={`text-xs text-slate-600 mt-2 border-t pt-2 ${classes.border}`}>
                                        {spot.owner ? (
                                            <>
                                                <p className="font-medium">{spot.owner.name}</p>
                                                <p>{spot.owner.apartment}</p>
                                            </>
                                        ) : <p className="italic">Propietario no asignado</p>}
                                    </div>
                                </div>
                                {spot.occupant && (
                                    <div className={`mt-2 pt-2 border-t border-dashed ${classes.border}`}>
                                        <p className="text-xs font-bold text-slate-700">Vehículo Asignado:</p>
                                        <p className="text-xs text-slate-600 font-mono">{spot.occupant.licensePlate}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
             {filteredSpots.length === 0 && parkingData.length > 0 && (
                <div className="text-center py-10">
                    <p className="text-slate-500">No se encontraron estacionamientos que coincidan con "{searchTerm}".</p>
                </div>
             )}
        </div>
    );
};

export default ParkingScreen;
