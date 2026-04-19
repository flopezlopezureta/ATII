import React, { useEffect, useRef } from 'react';
import QRCode from 'https://esm.sh/qrcode';
import { Invitation } from '../types.ts';
import { getAppSettings } from '../services/settingsService.ts';
import QrCodeIcon from './icons/QrCodeIcon.tsx';
import WhatsAppIcon from './icons/WhatsAppIcon.tsx';


interface InvitationDisplayModalProps {
  invitation: Invitation | null;
  onClose: () => void;
}

const InvitationDisplayModal: React.FC<InvitationDisplayModalProps> = ({ invitation, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const qrCodeContent = invitation ? JSON.stringify({
    type: "inv",
    id: invitation.id,
    guest: invitation.guestName || invitation.licensePlate,
    rut: invitation.guestIdDocument,
    from: invitation.validFrom,
    until: invitation.validUntil,
  }) : '';

  useEffect(() => {
    if (invitation && canvasRef.current && qrCodeContent) {
      QRCode.toCanvas(canvasRef.current, qrCodeContent, {
            width: 256,
            margin: 2,
            color: {
              dark:"#0f172a", // slate-900
              light:"#FFFFFF"
            }
        }, (error) => {
          if (error) {
            console.error('Error generating QR code:', error);
          } else if (canvasRef.current && imageRef.current) {
            imageRef.current.src = canvasRef.current.toDataURL('image/png');
          }
        });
    }
  }, [invitation, qrCodeContent]);
  
  const handleShareViaWhatsApp = async () => {
    if (!invitation || !canvasRef.current) return;
    
    if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
        alert("No se pudo generar la imagen de la invitación, por favor intente de nuevo.");
        return;
    }

    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const appSettings = getAppSettings();
    
    // --- Configuration ---
    const qrCanvas = canvasRef.current;
    const qrSize = 250;
    const padding = 30;
    const canvasWidth = 500;
    const contentWidth = canvasWidth - padding * 2;
    const textColor = '#334155'; // slate-700
    const backgroundColor = '#FFFFFF';
    const boldFont = 'bold 16px sans-serif';
    const regularFont = '16px sans-serif';
    const lineHeight = 24;
    const sectionSpacing = 12;

    const dateOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    };
    const fromDate = new Date(invitation.validFrom).toLocaleString('es-CL', dateOptions);
    const untilDate = new Date(invitation.validUntil).toLocaleString('es-CL', dateOptions);

    const lines: { text?: string; font?: string; spacer?: number; }[] = [];
    
    lines.push({ text: `¡Hola! Te comparto una invitación de acceso para ${appSettings.condominiumName}.`, font: regularFont });
    lines.push({ spacer: sectionSpacing });
    lines.push({ text: 'Detalles de la Invitación:', font: boldFont });
    if (invitation.type === 'person') {
        lines.push({ text: `Invitado: ${invitation.guestName || 'N/A'}`, font: regularFont });
        lines.push({ text: `RUT: ${invitation.guestIdDocument || 'N/A'}`, font: regularFont });
    } else {
        lines.push({ text: `Vehículo: ${invitation.licensePlate || 'N/A'}`, font: regularFont });
        lines.push({ text: `Conductor: ${invitation.guestName || 'N/A'}`, font: regularFont });
        lines.push({ text: `RUT Conductor: ${invitation.guestIdDocument || 'N/A'}`, font: regularFont });
    }
    lines.push({ spacer: sectionSpacing });
    lines.push({ text: 'Validez:', font: boldFont });
    lines.push({ text: `Desde: ${fromDate}`, font: regularFont });
    lines.push({ text: `Hasta: ${untilDate}`, font: regularFont });
    lines.push({ spacer: sectionSpacing });
    lines.push({ text: `ID: ${invitation.id}`, font: regularFont });
    const warningText = `ADVERTENCIA: La invitación es personal y válida solo para el ${invitation.type === 'person' ? 'RUT' : 'vehículo y conductor'} autorizado.`;
    lines.push({ text: warningText, font: boldFont });

    // --- Helper function to calculate wrapped text height ---
    const calculateWrappedTextHeight = (text: string, font: string): number => {
        ctx.font = font;
        const words = text.split(' ');
        let line = '';
        let lineCount = 1;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > contentWidth && n > 0) {
                line = words[n] + ' ';
                lineCount++;
            } else {
                line = testLine;
            }
        }
        return lineCount * lineHeight;
    };

    // --- Calculate total height ---
    let totalHeight = padding * 2 + qrSize + sectionSpacing * 2; // Initial height with QR + padding
    for (const line of lines) {
        if (line.spacer) {
            totalHeight += line.spacer;
        } else if (line.text && line.font) {
            totalHeight += calculateWrappedTextHeight(line.text, line.font);
        }
    }

    // --- Draw Everything ---
    finalCanvas.width = canvasWidth;
    finalCanvas.height = totalHeight;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, totalHeight);
    ctx.drawImage(qrCanvas, (canvasWidth - qrSize) / 2, padding, qrSize, qrSize);

    // --- Helper function to draw wrapped text ---
    const drawWrappedText = (text: string, x: number, y: number, font: string): number => {
        ctx.font = font;
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > contentWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
    };

    let currentY = padding + qrSize + sectionSpacing * 2;
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    
    for (const line of lines) {
      if (line.spacer) {
        currentY += line.spacer;
      } else if (line.text && line.font) {
        currentY = drawWrappedText(line.text, padding, currentY, line.font);
      }
    }

    // --- Share ---
    try {
        const blob = await new Promise<Blob | null>(resolve => finalCanvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not create image blob.');
        const imageFile = new File([blob], `invitacion-${appSettings.condominiumName}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            await navigator.share({
                files: [imageFile],
                title: `Invitación de Acceso - ${appSettings.condominiumName}`,
            });
        } else {
            alert('Tu navegador no soporta compartir imágenes. Intenta guardar la imagen y enviarla manualmente.');
        }
    } catch (error) {
        console.error('Error al compartir:', error);
    }
  };


  if (!invitation) return null;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 transition-opacity duration-300 ease-in-out"
        aria-modal="true"
        role="dialog"
        aria-labelledby="invitation-modal-title"
        onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
                <QrCodeIcon className="w-8 h-8 text-slate-700" />
                <h3 id="invitation-modal-title" className="text-xl font-semibold text-slate-800">
                    Invitación Generada
                </h3>
            </div>
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 text-3xl leading-none transition-colors"
                aria-label="Cerrar modal"
            >
                &times;
            </button>
        </div>
        
        <div className="text-center flex flex-col items-center justify-center space-y-4">
            <p className="text-slate-600">Muestra este código QR en conserjería o compártelo con tu visita.</p>
            
            <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg inline-block">
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <img ref={imageRef} alt="Código QR de la invitación" className="w-64 h-64 bg-slate-100" />
            </div>

            <div className="w-full p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-500">ID de Invitación:</p>
                <p className="text-lg font-mono font-semibold text-slate-800 break-all">{invitation.id}</p>
            </div>
            
            <div className="w-full border-t border-slate-200 pt-3 text-sm text-left">
              {invitation.type === 'person' ? (
                <>
                  <p><span className="font-semibold">Para:</span> {invitation.guestName}</p>
                  <p><span className="font-semibold">RUT:</span> {invitation.guestIdDocument}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">Vehículo (Placa):</span> {invitation.licensePlate}</p>
                  {invitation.guestName && <p><span className="font-semibold">Conductor:</span> {invitation.guestName}</p>}
                  {invitation.guestIdDocument && <p><span className="font-semibold">RUT Conductor:</span> {invitation.guestIdDocument}</p>}
                </>
              )}
              <p><span className="font-semibold">Válido desde:</span> {new Date(invitation.validFrom).toLocaleString('es-CL')}</p>
              <p><span className="font-semibold">Válido hasta:</span> {new Date(invitation.validUntil).toLocaleString('es-CL')}</p>
              {invitation.notes && <p><span className="font-semibold">Notas:</span> {invitation.notes}</p>}
            </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <button
                type="button"
                onClick={handleShareViaWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm"
            >
                <WhatsAppIcon className="w-5 h-5"/>
                Enviar por WhatsApp
            </button>
             <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationDisplayModal;