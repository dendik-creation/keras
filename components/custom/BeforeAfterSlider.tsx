"use client";

import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  altBefore?: string;
  altAfter?: string;
  initialPosition?: number;
  showIntroAnimation?: boolean;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  altBefore = "Before",
  altAfter = "After",
  initialPosition = 50,
  showIntroAnimation = true,
  className,
}: BeforeAfterSliderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const handleImageLoad = () => {
    setImagesLoaded((prev) => prev + 1);
  };

  useEffect(() => {
    if (imagesLoaded >= 2) {
      setIsLoaded(true);
    }
  }, [imagesLoaded]);

  useEffect(() => {
    if (!isLoaded || !showIntroAnimation || hasInteracted || !containerRef.current) return;

    let observer: IntersectionObserver;
    let animationFrame: number;
    let startTime: number | null = null;
    
    const duration = 2500;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const newPos = 50 - Math.sin(progress * Math.PI * 2) * 15;
      
      if (!hasInteracted) {
         setPosition(newPos);
      }

      if (progress < 1 && !hasInteracted) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        if (!hasInteracted) setPosition(50);
      }
    };

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animationFrame = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isLoaded, showIntroAnimation, hasInteracted]);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPosition(percentage);
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setHasInteracted(true);
    updatePosition(e.clientX);
    e.currentTarget.focus();
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    setHasInteracted(true);
    if (e.key === "ArrowLeft") {
      setPosition((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      setPosition((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden select-none touch-none rounded-b-md border-x-2 border-b-2 border-white/15 outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-white",
        className,
        !isLoaded && "opacity-0",
        isLoaded && "transition-opacity duration-500 opacity-100"
      )}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Compare before and after schedule"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ cursor: isDragging ? "ew-resize" : "auto" }}
    >
      <div className="relative w-full h-auto">
        <Image
          src={afterImage}
          alt={altAfter}
          width={1920}
          height={1080}
          className="w-full h-auto object-cover pointer-events-none"
          priority
          onLoad={handleImageLoad}
          draggable={false}
        />
      </div>

      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          willChange: "clip-path",
        }}
      >
        <Image
          src={beforeImage}
          alt={altBefore}
          width={1920}
          height={1080}
          className="w-full h-full object-cover pointer-events-none"
          priority
          onLoad={handleImageLoad}
          draggable={false}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{
          left: `${position}%`,
          transform: "translateX(-50%)",
          willChange: "left",
        }}
      >
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all duration-200",
            isDragging ? "scale-110 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-ew-resize" : "hover:scale-110 hover:shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-grab"
          )}
        >
          <div className="flex items-center text-black/70">
            <ChevronLeft className="w-4 h-4 -mr-1" />
            <ChevronRight className="w-4 h-4 -ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
