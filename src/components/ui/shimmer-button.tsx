import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "primary" | "dark" | "outline";
}

export function ShimmerButton({
  children = "Get started ➔",
  className,
  variant = "primary",
  ...props
}: ShimmerButtonProps) {
  const variantStyles = {
    // Dorado / Ámbar característico de Audenti
    primary:
      "bg-amber-400 text-slate-950 font-black shadow-amber-400/20 hover:bg-amber-300",
    // Fondo oscuro de lujo con detalles dorados
    dark:
      "bg-slate-950 text-white font-bold border border-white/20 hover:border-amber-400/80 shadow-slate-950/40",
    // Borde transparente
    outline:
      "bg-white/10 text-white font-bold border border-white/20 backdrop-blur-md hover:bg-white/20",
  };

  return (
    <button
      className={cn(
        // Estilos base, forma de píldora y touch-friendly para iOS y Android
        "relative inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs sm:text-sm font-bold overflow-hidden cursor-pointer",
        // Animación de crecimiento y tap feedback para móvil y escritorio
        "transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg select-none",
        variantStyles[variant],
        className
      )}
      style={{ touchAction: "manipulation" }}
      {...props}
    >
      {/* Contenedor de la orilla de luz / destello shimmer */}
      <span
        className={cn(
          "absolute inset-0 rounded-full shimmer-ring pointer-events-none",
          variant === "primary" ? "shimmer-ring-dark" : "shimmer-ring-light"
        )}
      />

      {/* Contenido / Texto del botón */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
