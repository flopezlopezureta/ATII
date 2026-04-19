import { UserIcon, TruckIcon, QrCodeIcon, EyeIcon, EyeSlashIcon } from './icons.js';
import { formatTimestamp } from '../utils.js';
import { EntryType } from '../constants.js';

function createModal(id, content, maxWidth = 'max-w-lg', onClose) {
    const modalContainer = document.createElement('div');
    modalContainer.id = id;
    modalContainer.className = "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 transition-opacity duration-300 ease-in-out";
    modalContainer.setAttribute('aria-modal', 'true');
    modalContainer.setAttribute('role', 'dialog');
    
    modalContainer.innerHTML = `
      <div class="bg-white p-6 rounded-xl shadow-2xl w-full ${maxWidth} transform transition-all duration-300 ease-in-out scale-95 opacity-0 max-h-[90vh] overflow-y-auto" data-modal-content>
        ${content}
      </div>
    `;

    document.body.appendChild(modalContainer);
    
    // Animate in
    setTimeout(() => {
        const modalContent = modalContainer.querySelector('[data-modal-content]');
        modalContainer.classList.add('opacity-100');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);


    const closeModal = () => {
        const modalContent = modalContainer.querySelector('[data-modal-content]');
        modalContainer.classList.remove('opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            if (modalContainer.parentNode) {
                modalContainer.parentNode.removeChild(modalContainer);
            }
            if (onClose) onClose();
        }, 300);
    };

    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeModal();
        }
    });

    modalContainer.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    return { modalElement: modalContainer, closeModal };
}

export function showEntryDetailModal(entry) {
    if (!entry) return;

    const isPersonEntry = entry.type === EntryType.PERSON;
    const icon = isPersonEntry ? UserIcon('w-8 h-8 mr-3 text-sky-600') : TruckIcon('w-8 h-8 mr-3 text-teal-600');
    const typeText = isPersonEntry ? 'Persona' : 'Vehículo';
    const typeColor = isPersonEntry ? 'text-sky-700' : 'text-teal-700';

    const renderDetailItem = (label, value) => `
        <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt class="text-sm font-medium text-slate-500">${label}:</dt>
            <dd class="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2 break-words">
                ${value || '<span class="italic text-slate-400">No especificado</span>'}
            </dd>
        </div>
    `;

    const detailsHtml = `
        ${renderDetailItem('ID del Registro', entry.id)}
        ${renderDetailItem('Fecha y Hora', formatTimestamp(entry.timestamp, 'es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))}
        ${isPersonEntry ? `
            ${renderDetailItem('Nombre Completo', entry.name)}
            ${renderDetailItem('Documento ID (RUT)', entry.idDocument)}
            ${renderDetailItem('Apartamento/Unidad', entry.apartment)}
        ` : `
            ${renderDetailItem('Placa Patente', entry.licensePlate)}
            ${renderDetailItem('Nombre del Conductor', entry.driverName)}
            ${renderDetailItem('Estacionamiento Asignado', entry.parkingSpot)}
        `}
        ${renderDetailItem('Autorizado Por', entry.authorizedBy)}
        ${entry.invitationId ? renderDetailItem('ID de Invitación', entry.invitationId) : ''}
    `;

    const content = `
        <div class="flex items-start justify-between mb-4 border-b pb-3 border-slate-200">
            <div class="flex items-center">
                ${icon}
                <div>
                    <h3 class="text-xl font-semibold text-slate-800">Detalle del Registro</h3>
                    <p class="text-sm ${typeColor}">${typeText}</p>
                </div>
            </div>
            <button data-close-modal class="text-slate-400 hover:text-slate-600 text-3xl leading-none transition-colors">&times;</button>
        </div>
        <dl class="divide-y divide-slate-200">${detailsHtml}</dl>
        <div class="mt-6 pt-4 border-t border-slate-200 flex justify-end">
            <button data-close-modal class="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg">Cerrar</button>
        </div>
    `;
    createModal('entry-detail-modal', content);
}

export function showInvitationDisplayModal(invitation) {
    if (!invitation) return;

    const qrCodeContent = JSON.stringify({ type: "inv", id: invitation.id });

    const content = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
                ${QrCodeIcon('w-8 h-8 text-slate-700')}
                <h3 class="text-xl font-semibold text-slate-800">Invitación Generada</h3>
            </div>
            <button data-close-modal class="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
        </div>
        <div class="text-center flex flex-col items-center justify-center space-y-4">
            <p class="text-slate-600">Muestra este código QR al guardia o comparte el ID.</p>
            <div class="p-4 border-2 border-dashed border-slate-300 rounded-lg inline-block">
                <canvas id="qr-canvas"></canvas>
            </div>
            <div class="w-full p-3 bg-slate-100 rounded-lg">
                <p class="text-sm text-slate-500">ID de Invitación:</p>
                <p class="text-lg font-mono font-semibold text-slate-800 break-all">${invitation.id}</p>
            </div>
            <div class="w-full border-t border-slate-200 pt-3 text-sm text-left">
                <p><span class="font-semibold">Para:</span> ${invitation.type === 'person' ? invitation.guestName : invitation.licensePlate}</p>
                <p><span class="font-semibold">Válido hasta:</span> ${new Date(invitation.expiresAt).toLocaleString('es-CL')}</p>
                ${invitation.notes ? `<p><span class="font-semibold">Notas:</span> ${invitation.notes}</p>` : ''}
            </div>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button id="share-invitation-btn" class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg">Compartir</button>
            <button data-close-modal class="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cerrar</button>
        </div>
    `;

    const { modalElement } = createModal('invitation-display-modal', content, 'max-w-md');
    
    const canvas = modalElement.querySelector('#qr-canvas');
    QRCode.toCanvas(canvas, qrCodeContent, { width: 256, margin: 2, color: { dark: "#0f172a", light: "#FFFFFF" } }, (error) => {
        if (error) console.error('Error generando QR:', error);
    });

    modalElement.querySelector('#share-invitation-btn').addEventListener('click', async () => {
        const shareData = {
            title: 'Invitación de Acceso',
            text: `Invitación para ${invitation.guestName || invitation.licensePlate}. ID: ${invitation.id}`,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(`ID de Invitación: ${invitation.id}\n${qrCodeContent}`);
                alert('API de compartir no disponible. ID copiado al portapapeles.');
            }
        } catch (err) {
            console.error('Error al compartir:', err);
            alert('No se pudo compartir.');
        }
    });
}

export function showRutErrorModal(message) {
    const content = `
        <h3 class="text-lg font-semibold text-red-700 mb-3">Error de RUT</h3>
        <p class="text-sm text-slate-700 mb-5 whitespace-pre-wrap">${message}</p>
        <div class="flex justify-end">
            <button data-close-modal class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Aceptar</button>
        </div>
    `;
    createModal('rut-error-modal', content, 'max-w-sm');
}

export function showPasswordConfirmModal({ onConfirm, loading, errorMessage }) {
    const content = `
        <h2 class="text-xl font-semibold text-slate-800 mb-1">Confirmar Acción</h2>
        <p class="text-sm text-slate-600 mb-4">Por seguridad, ingresa tu contraseña para continuar.</p>
        ${errorMessage ? `<p id="password-error-msg" class="mb-3 text-red-600 bg-red-100 p-2 rounded-md text-sm">${errorMessage}</p>`: ''}
        <form id="password-confirm-form">
            <div class="mb-4">
                <label for="confirm-password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <div class="relative">
                    <input type="password" id="confirm-password" required class="w-full px-3 py-2 border border-slate-300 rounded-lg pr-10">
                    <button type="button" id="toggle-password-visibility" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                        ${EyeIcon()}
                    </button>
                </div>
            </div>
            <div class="flex justify-end space-x-3">
                <button type="button" data-close-modal class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button>
                <button type="submit" id="confirm-action-btn" class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-70">Confirmar</button>
            </div>
        </form>
    `;

    const { modalElement, closeModal } = createModal('password-confirm-modal', content, 'max-w-sm');
    
    const form = modalElement.querySelector('#password-confirm-form');
    const passwordInput = modalElement.querySelector('#confirm-password');
    const toggleBtn = modalElement.querySelector('#toggle-password-visibility');

    toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? EyeSlashIcon() : EyeIcon();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const confirmBtn = modalElement.querySelector('#confirm-action-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Verificando...';
        onConfirm(passwordInput.value, closeModal);
    });
}
