'use client';

import React, { useState } from 'react';
import { Star, ExternalLink, CheckCircle2 } from 'lucide-react';

interface ReviewPlatform {
  name: string;
  url: string;
  color: string;
  badge: string;
}

const PLATFORMS: ReviewPlatform[] = [
  {
    name: 'Google Maps',
    url: 'https://maps.google.com/?q=Audenti+Dra+Aura+Estudillo',
    color: 'from-blue-600 to-emerald-600',
    badge: 'Máximo Impacto Local'
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com/audenti.clinica',
    color: 'from-pink-600 to-purple-600',
    badge: 'Comunidad Estética'
  },
  {
    name: 'Facebook',
    url: 'https://facebook.com/audenti.clinica',
    color: 'from-blue-700 to-indigo-700',
    badge: 'Recomendaciones'
  },
  {
    name: 'TikTok',
    url: 'https://tiktok.com/@audenti.clinica',
    color: 'from-neutral-800 to-neutral-950',
    badge: 'Casos y Sonrisas'
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com/@audenti.clinica',
    color: 'from-red-600 to-rose-700',
    badge: 'Testimonios en Video'
  }
];

export function ReviewRedirectEngine() {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState<boolean>(false);

  const handleSelectStar = (stars: number) => {
    setRating(stars);
    setHasRated(true);
  };

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-white shadow-2xl text-center space-y-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
          Experiencia Clínica Audenti
        </span>
        <h3 className="text-2xl font-bold tracking-tight">¿Cómo calificarías tu atención con la Dra. Aura?</h3>
        <p className="text-sm text-neutral-400">
          Tu opinión impulsa nuestra excelencia médica y ayuda a más pacientes a transformar su salud oral.
        </p>
      </div>

      {/* Selector de Estrellas Interactivo */}
      <div className="flex justify-center items-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hoverRating || rating) >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleSelectStar(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
              aria-label={`Calificar con ${star} estrellas`}
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  active ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-neutral-700'
                }`}
              />
            </button>
          );
        })}
      </div>

      {hasRated && rating >= 4 && (
        <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs sm:text-sm animate-in fade-in zoom-in-95 space-y-1">
          <p className="font-bold text-amber-300">¡Muchas gracias por tu excelente valoración de {rating} estrellas!</p>
          <p className="text-neutral-300">
            Te invitamos a compartir tu reseña en tu plataforma favorita con un solo clic:
          </p>
        </div>
      )}

      {hasRated && rating < 4 && (
        <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700 text-neutral-300 text-xs sm:text-sm animate-in fade-in space-y-1">
          <p className="font-bold text-white">Agradecemos sinceramente tu retroalimentación.</p>
          <p className="text-neutral-400">
            La Dirección Médica de la Dra. Aura Estudillo revisará personalmente tu caso para garantizar tu satisfacción integral.
          </p>
        </div>
      )}

      {/* Redirecciones Sociales Automatizadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
        {PLATFORMS.map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 transition-all flex items-center justify-between group hover:scale-[1.02]"
          >
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-amber-300 transition-colors">
                {platform.name}
              </span>
              <span className="text-[10px] text-neutral-400">{platform.badge}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}
