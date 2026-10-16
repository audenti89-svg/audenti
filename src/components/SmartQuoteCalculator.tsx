'use client';

import React, { useState } from 'react';

interface QuoteState {
  projectType: string;
  features: string[];
  name: string;
  email: string;
  phone: string;
}

export function SmartQuoteCalculator() {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<QuoteState>({
    projectType: 'Micro-SaaS',
    features: [],
    name: '',
    email: '',
    phone: '',
  });

  const calculateEstimate = () => {
    let basePrice = 12000;
    if (formData.projectType === 'E-commerce') basePrice = 18000;
    if (formData.projectType === 'Plataforma 3D') basePrice = 25000;
    if (formData.projectType === 'Web App a Medida') basePrice = 30000;
    
    const featureCost = formData.features.length * 3500;
    return `$${(basePrice + featureCost).toLocaleString('es-MX')} MXN`;
  };

  const handleWhatsAppHandoff = (e: React.FormEvent) => {
    e.preventDefault();
    const estimatedTotal = calculateEstimate();
    
    const whatsappMessage = `Hola, acabo de cotizar en su sitio web:
- Nombre: ${formData.name}
- Proyecto: ${formData.projectType}
- Funcionalidades: ${formData.features.join(', ')}
- Estimación calculada: ${estimatedTotal}
Deseo agendar una sesión técnica con su equipo.`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const targetNumber = '5215500000000'; // Reemplazar con número de destino real
    
    window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-[#111315] border border-neutral-800 rounded-xl text-white shadow-2xl">
      <h3 className="text-2xl font-bold tracking-tight mb-2">Calculadora Inteligente de Proyectos</h3>
      <p className="text-neutral-400 text-sm mb-6">Obtén una estimación precisa y conéctate directamente con nuestros ingenieros.</p>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-300">1. ¿Qué tipo de aplicación necesitas?</label>
          <div className="grid grid-cols-2 gap-3">
            {['Micro-SaaS', 'E-commerce', 'Plataforma 3D', 'Web App a Medida'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, projectType: type })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.projectType === type 
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' 
                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full mt-6 py-3 bg-yellow-500 text-neutral-950 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Siguiente paso
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-300">2. Datos de contacto para el envío de la cotización</label>
          <form onSubmit={handleWhatsAppHandoff} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nombre completo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Dr. Ricardo Sánchez"
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Número de WhatsApp</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+52 55 0000 0000"
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            
            <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800 flex justify-between items-center my-4">
              <div>
                <span className="text-xs text-neutral-400 block">Estimación preliminar:</span>
                <span className="text-xl font-bold text-yellow-400">{calculateEstimate()}</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">
                Desarrollo en 24h
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-neutral-800 text-neutral-300 font-semibold rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
              >
                Enviar cotización por WhatsApp
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
