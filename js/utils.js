import { EntryType } from './constants.js';

export function formatTimestamp(isoString, locale = 'es-CL', options = {}) {
    const defaultOptions = {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return new Date(isoString).toLocaleString(locale, { ...defaultOptions, ...options });
}

export function escapeCsvField(field) {
    if (field === undefined || field === null) return '""';
    const stringField = String(field);
    const escapedField = stringField.replace(/"/g, '""');
    return `"${escapedField}"`;
};

export function formatEntriesForEmail(currentEntries) {
    if (!currentEntries.length) return "No hay registros para generar en CSV.";
    
    const headers = ["Tipo", "Fecha", "Hora", "Nombre", "Documento ID", "Apartamento/Unidad", "Placa Patente", "Nombre del Conductor", "Estacionamiento", "Autorizado Por", "ID Invitacion"];
    const csvRows = [headers.map(escapeCsvField).join(',')];

    currentEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        let rowValues = [];

        if (entry.type === EntryType.PERSON) {
            rowValues = ["Persona", formattedDate, formattedTime, entry.name, entry.idDocument, entry.apartment, undefined, undefined, undefined, entry.authorizedBy, entry.invitationId];
        } else if (entry.type === EntryType.VEHICLE) {
            rowValues = ["Vehículo", formattedDate, formattedTime, undefined, undefined, undefined, entry.licensePlate, entry.driverName, entry.parkingSpot, entry.authorizedBy, entry.invitationId];
        }
        csvRows.push(rowValues.map(field => escapeCsvField(field)).join(','));
    });
    return csvRows.join('\n');
}

export function showFeedback(containerId, type, message, duration = 3000) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const feedbackEl = document.createElement('div');
    feedbackEl.className = `p-3 rounded-md text-sm ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`;
    feedbackEl.textContent = message;
    
    // Clear previous feedback
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    container.appendChild(feedbackEl);

    setTimeout(() => {
        if(feedbackEl.parentNode === container) {
            container.removeChild(feedbackEl);
        }
    }, duration);
}

// Helper function to parse OCR text
export const parseOcrText = (ocrText) => {
    let parsedId = '';
    let parsedName = '';
    let errorMessage = '';

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim() === '') {
        return { id: '', name: '', error: 'Texto OCR vacío.' };
    }

    const text = ocrText.toUpperCase();

    const rutRegex = /(\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}-?[\dkK])/; 
    let potentialRutMatch = text.match(rutRegex);
    
    if (potentialRutMatch && potentialRutMatch[0]) {
        parsedId = potentialRutMatch[0];
    } else {
        const simpleRutRegex = /(\d{7,9}-?[\dkK])/;
        potentialRutMatch = text.match(simpleRutRegex);
        if (potentialRutMatch && potentialRutMatch[0]) {
            parsedId = potentialRutMatch[0];
        }
    }
    
    const nameKeywords = ["NOMBRE", "NOMBRES", "APELLIDO", "APELLIDOS", "NAME"];
    const lines = text.split('\n');
    let nameLineFound = false;
    for (const line of lines) {
        for (const keyword of nameKeywords) {
            if (line.includes(keyword)) {
                let potentialName = line.replace(keyword, '').trim();
                potentialName = potentialName.replace(/[^A-Z\sÑÁÉÍÓÚÜ]/gi, '').trim(); 
                if (potentialName.length > 3 && potentialName.split(' ').length >= 2) { 
                    parsedName = potentialName;
                    nameLineFound = true;
                    break;
                }
            }
        }
        if (nameLineFound) break;
    }
    
    if (!parsedName) {
        const apellidoKeywords = ["APELLIDO", "APELLIDOS"];
        for (const line of lines) {
             for (const keyword of apellidoKeywords) {
                if (line.includes(keyword)) {
                    let potentialName = line.replace(keyword, '').trim();
                    potentialName = potentialName.replace(/[^A-Z\sÑÁÉÍÓÚÜ]/gi, '').trim();
                    if (potentialName.length > 3) { 
                        parsedName = potentialName; 
                        nameLineFound = true;
                        break;
                    }
                }
            }
            if (nameLineFound) break;
        }
    }

    if (!parsedId && !parsedName) {
        errorMessage = 'No se pudo extraer RUT ni Nombre del texto introducido.';
    } else if (!parsedId) {
        errorMessage = 'Nombre extraído, pero no se pudo encontrar un RUT válido.';
    } else if (!parsedName) {
        errorMessage = 'RUT extraído, pero no se pudo encontrar un Nombre.';
    }

    return { id: parsedId.toUpperCase(), name: parsedName, error: errorMessage };
};
