"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import "./MagicBento.css";

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "255, 48, 0"; // Swiss Red #FF3000
const MOBILE_BREAKPOINT = 768;

export interface BentoCardData {
  color?: string;
  title: string;
  description: string;
  badges: string[];
  preview: React.ReactNode;
}

const PreviewUnifiedSchedule = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs overflow-hidden group">
    <div className="flex justify-between border-b border-black/10 pb-2 mb-2 font-mono font-bold">
      <span>24 SKS</span>
      <span>4 Jadwal</span>
      <span>0 Bentrok</span>
    </div>
    <div className="flex-1 grid grid-cols-5 gap-1 relative h-full min-h-0">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:100%_10px]"></div>
      {["M", "T", "W", "T", "F"].map((d, i) => (
        <div key={i} className="flex flex-col gap-1 z-10 h-full">
          <div className="text-black/40 font-bold text-center border-b border-black/10 pb-1 mb-1">{d}</div>
          {i === 1 && <div className="w-full h-8 bg-black/5 border border-black/10"></div>}
          {i === 2 && <div className="w-full h-12 bg-black/5 border border-black/10 transition-colors duration-300 group-hover:bg-[#FF3000] group-hover:border-[#FF3000]"></div>}
          {i === 3 && <div className="w-full h-10 bg-black/5 border border-black/10"></div>}
          {i === 4 && <div className="w-full h-8 bg-black/5 border border-black/10 mt-4"></div>}
        </div>
      ))}
    </div>
  </div>
);

const PreviewPerangKRS = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs font-mono group">
    <div className="font-bold mb-2">Rapid Submit</div>
    <div className="flex items-center gap-2 mb-4">
      <div className="flex-1 h-2 bg-black/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-[80%] bg-[#FF3000] transition-transform duration-500 origin-left group-hover:scale-x-110"></div>
      </div>
      <span>100%</span>
    </div>
    <div className="grid grid-cols-3 gap-2 mt-auto">
      <div>
        <div className="text-black/40 mb-1">Latency</div>
        <div className="font-bold">42ms</div>
      </div>
      <div>
        <div className="text-black/40 mb-1">Retry</div>
        <div className="font-bold">0</div>
      </div>
      <div>
        <div className="text-black/40 mb-1">Status</div>
        <div className="font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#FF3000] animate-pulse rounded-full"></span>
          Submitting
        </div>
      </div>
    </div>
  </div>
);

const PreviewZeroDB = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs font-mono group">
    <div className="flex items-center justify-between h-full">
      <div className="flex flex-col items-center justify-center gap-2 flex-1">
        <div className="px-2 py-1 border border-black bg-black/5 font-bold">Data</div>
        <div className="text-black/40">↓</div>
        <div className="px-2 py-1 border border-black bg-black/5 font-bold transition-transform duration-300 group-hover:-translate-y-1">Browser</div>
      </div>
      <div className="w-px h-16 bg-black/10 mx-2"></div>
      <div className="flex flex-col items-center justify-center gap-2 flex-1 opacity-40">
        <div className="px-2 py-1 border border-dashed border-black text-center">Server</div>
        <div className="font-bold text-center">Disabled</div>
      </div>
    </div>
  </div>
);

const PreviewRealtime = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs font-mono group">
    <div className="flex items-center gap-1 font-bold text-[#FF3000] mb-2">
      <span className="w-1.5 h-1.5 bg-[#FF3000] animate-pulse rounded-full"></span>
      Live
    </div>
    <div className="border-t border-black/10 my-2"></div>
    <div className="flex flex-col gap-2 flex-1 justify-center">
      <div className="flex justify-between text-black/40">
        <span>Detected</span>
        <span>↓</span>
      </div>
      <div className="flex justify-between">
        <span>Refreshing</span>
        <span className="group-hover:animate-spin">⟳</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Synchronized</span>
        <span>2 sec ago</span>
      </div>
    </div>
  </div>
);

const PreviewShare = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs group">
    <div className="font-bold font-mono mb-2">Share Schedule</div>
    <div className="flex items-center justify-between border border-black p-1 bg-black/5 mb-3">
      <span className="font-mono truncate pl-1">keras.dendikcreation.dev/share-schedule/...</span>
      <div className="px-2 py-1 bg-black text-white font-bold transition-colors group-hover:bg-[#FF3000] text-[10px]">
        <span className="group-hover:hidden">Copy</span>
        <span className="hidden group-hover:inline">Copied ✓</span>
      </div>
    </div>
    <div className="flex justify-end items-center mt-auto">
      <div className="flex -space-x-1">
        <div className="w-4 h-4 border border-white bg-black/20"></div>
        <div className="w-4 h-4 border border-white bg-black/40"></div>
        <div className="w-4 h-4 border border-white bg-[#FF3000]"></div>
      </div>
    </div>
  </div>
);

const PreviewAnalytics = () => (
  <div className="flex flex-col h-full w-full border border-black bg-white p-3 text-[10px] md:text-xs font-mono group">
    <div className="text-black/40 mb-1 mt-auto">Unique Users in 30 Days</div>
    <div className="flex items-end gap-1 h-12">
      {[40, 60, 100, 80, 50].map((h, i) => (
        <div key={i} className={`flex-1 bg-black/10 transition-all duration-300 ${i === 2 ? 'group-hover:bg-[#FF3000]' : ''}`} style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);

const DEFAULT_CARDS: BentoCardData[] = [
  {
    color: "#ffffff",
    title: "Unified Schedule View",
    description: "Susun jadwal mata kuliah dengan tampilan yang terpadu dan nyaman",
    badges: ["Clean UI"],
    preview: <PreviewUnifiedSchedule />,
  },
  {
    color: "#ffffff",
    title: "Perang KRS",
    description: "Rapid submit demi mengamankan jadwal kelasmu",
    badges: ["Cepat", "Sekali Klik"],
    preview: <PreviewPerangKRS />,
  },
  {
    color: "#ffffff",
    title: "Zero Database",
    description: "Tidak ada data yang disimpan di server, semua di browser Anda",
    badges: ["Privacy First"],
    preview: <PreviewZeroDB />,
  },
  {
    color: "#ffffff",
    title: "Jadwal Realtime",
    description: "Jadwal selalu terbaru ketika kamu meminta KeRaS untuk memperbaruinya",
    badges: ["REALTIME", "SYNC"],
    preview: <PreviewRealtime />,
  },
  {
    color: "#ffffff",
    title: "Share Schedule",
    description: "Bagikan jadwalmu dengan temanmu untuk saling menjaga kelas",
    badges: ["SHARE"],
    preview: <PreviewShare />,
  },
  {
    color: "#ffffff",
    title: "Instant Analytics",
    description: "Pantau distribusi analitik mulai dari jumlah users, sebaran prodi, dan lainnya",
    badges: ["Reporting"],
    preview: <PreviewAnalytics />,
  },
];

const createParticleElement = (x: number, y: number, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.8);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

interface ParticleCardProps {
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const ParticleCard: React.FC<ParticleCardProps> = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId as unknown as NodeJS.Timeout);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.5) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => ripple.remove(),
        }
      );
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("click", handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("click", handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
};

interface GlobalSpotlightProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}

const GlobalSpotlight: React.FC<GlobalSpotlightProps> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.25) 0%,
        rgba(${glowColor}, 0.12) 15%,
        rgba(${glowColor}, 0.05) 25%,
        rgba(${glowColor}, 0.02) 40%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: multiply;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest(".bento-section");
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll<HTMLElement>(".magic-bento-card");

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
        cards.forEach((card) => {
          card.style.setProperty("--glow-intensity", "0");
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out",
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.9
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.9
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll<HTMLElement>(".magic-bento-card").forEach((card) => {
        card.style.setProperty("--glow-intensity", "0");
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid: React.FC<{ children: React.ReactNode; gridRef: React.RefObject<HTMLDivElement | null> }> = ({
  children,
  gridRef,
}) => (
  <div className="card-grid bento-section" ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

export interface MagicBentoProps {
  cards?: BentoCardData[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const MagicBento: React.FC<MagicBentoProps> = ({
  cards = DEFAULT_CARDS,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          const baseClassName = `magic-bento-card ${textAutoHide ? "magic-bento-card--text-autohide" : ""} ${
            enableBorderGlow ? "magic-bento-card--border-glow" : ""
          }`;
          const cardProps = {
            className: baseClassName,
            style: {
              backgroundColor: card.color || "#ffffff",
              "--glow-color": glowColor,
            } as React.CSSProperties,
          };

          const cardPreview = (
            <div className="magic-bento-card__preview">
              {card.preview}
            </div>
          );

          const cardContent = (
            <div className="magic-bento-card__content font-sans">
              <h2 className="magic-bento-card__title">{card.title}</h2>
              <p className="magic-bento-card__description">{card.description}</p>
              <div className="magic-bento-card__badges">
                {card.badges?.map((badge, i) => (
                  <span key={i} className="magic-bento-badge">{badge}</span>
                ))}
              </div>
            </div>
          );

          if (enableStars) {
            return (
              <ParticleCard
                key={index}
                {...cardProps}
                disableAnimations={shouldDisableAnimations}
                particleCount={particleCount}
                glowColor={glowColor}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
              >
                {cardPreview}
                {cardContent}
              </ParticleCard>
            );
          }

          return (
            <div key={index} {...cardProps}>
              {cardPreview}
              {cardContent}
            </div>
          );
        })}
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;
