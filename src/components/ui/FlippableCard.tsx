import type { ReactNode } from "react";

interface FlippableCardProps {
  front: ReactNode;
  back: ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Reusable 3D flippable card component with animation
 */
export function FlippableCard({
  front,
  back,
  isFlipped,
  onFlip,
  onKeyDown,
  className = "",
  ariaLabel,
}: FlippableCardProps) {
  return (
    <div
      className={`relative w-full max-w-md h-80 cursor-pointer ${className}`}
      onClick={onFlip}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
          }}
        >
          {front}
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </div>

      {/* Flip indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          <div className={`w-2 h-2 rounded-full ${!isFlipped ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-2 h-2 rounded-full ${isFlipped ? "bg-primary" : "bg-muted"}`} />
        </div>
      </div>
    </div>
  );
}
