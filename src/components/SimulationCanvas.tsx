/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { PhysicsParams, SimulationState, CameraMode } from '../types/physics.ts';
import { Volume2, VolumeX } from 'lucide-react';

interface SimulationCanvasProps {
  state: SimulationState;
  params: PhysicsParams;
  cameraMode: CameraMode;
  showFluxLines: boolean;
  showAerodynamics: boolean;
  showForceVectors: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onCycleWeather?: () => void;
  topRightContent?: React.ReactNode;
  onResetCamera?: () => void;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface AirStreamline {
  xOffset: number;
  yOffset: number;
  speed: number;
  alpha: number;
  length: number;
}

interface WeatherParticle {
  x: number;
  y: number;
  speed: number;
  length: number;
  radius: number;
  drift: number;
  alpha: number;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  state,
  params,
  cameraMode,
  showFluxLines,
  showAerodynamics,
  showForceVectors,
  isMuted,
  onToggleMute,
  onCycleWeather,
  topRightContent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Manual camera offset & zoom
  const [manualOffset, setManualOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Persistent particles
  const sparksRef = useRef<SparkParticle[]>([]);
  const streamlinesRef = useRef<AirStreamline[]>([]);
  const weatherParticlesRef = useRef<WeatherParticle[]>([]);
  const splashesRef = useRef<SplashParticle[]>([]);

  // HUIT Logo image ref for train livery decal
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/aistudio/logo_e84a77d9.png';
    img.onload = () => {
      logoImgRef.current = img;
    };
  }, []);

  // Initialize aerodynamic streamlines & weather particles
  useEffect(() => {
    const lines: AirStreamline[] = [];
    for (let i = 0; i < 45; i++) {
      lines.push({
        xOffset: Math.random() * 200 - 80,
        yOffset: -120 + Math.random() * 140,
        speed: 15 + Math.random() * 20,
        alpha: 0.15 + Math.random() * 0.45,
        length: 25 + Math.random() * 60,
      });
    }
    streamlinesRef.current = lines;

    const wParticles: WeatherParticle[] = [];
    for (let i = 0; i < 160; i++) {
      wParticles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        speed: 28 + Math.random() * 25,
        length: 12 + Math.random() * 18,
        radius: 1.2 + Math.random() * 2.2,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.45,
      });
    }
    weatherParticlesRef.current = wParticles;
  }, []);

  // Mouse wheel to zoom. Registered natively: React's onWheel is passive, so
  // preventDefault() inside it is ignored and the page can still scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => Math.max(0.35, Math.min(3.5, prev * factor)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - manualOffset.x, y: e.clientY - manualOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    setManualOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Auto resize to container, backing store scaled for HiDPI screens
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(cssWidth * dpr);
      const pixelHeight = Math.round(cssHeight * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const width = cssWidth;
      const height = cssHeight;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Base World Coordinates Setup
      // Guideway baseline Y coordinate in screen pixels
      const groundY = height * 0.68;
      const pixelsPerMeter = 14 * zoom;

      // Camera focal point calculation based on mode
      let cameraX = state.x;
      let cameraY = groundY;
      let effectiveZoom = zoom;

      if (cameraMode === 'BOGIE') {
        effectiveZoom = zoom * 2.2;
        cameraX = state.x - 6; // Focus near front bogie
        cameraY = groundY + 40;
      } else if (cameraMode === 'TRACKSIDE') {
        // Static camera location every 800m
        const cameraStation = Math.floor(state.x / 800) * 800 + 400;
        cameraX = cameraStation;
      } else if (cameraMode === 'OVERVIEW') {
        effectiveZoom = zoom * 0.42;
        cameraX = state.x + 80;
      }

      // Center camera on screen with manual offset
      const screenCenterX = width / 2 + manualOffset.x;
      const screenCenterY = cameraY + manualOffset.y;

      const worldToScreenX = (wx: number) => screenCenterX + (wx - cameraX) * pixelsPerMeter;
      const worldToScreenY = (wy: number) => screenCenterY - wy * pixelsPerMeter;

      // 1. SKY & ATMOSPHERE (Deep scientific dark slate gradient responding to weather)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (params.airDensity < 0.2) {
        // Hyperloop / Vacuum Tube Dark Chamber
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.65, '#090d16');
        skyGrad.addColorStop(1, '#05070e');
      } else if (params.weather === 'RAIN') {
        // Stormy overcast rain sky
        skyGrad.addColorStop(0, '#060a14');
        skyGrad.addColorStop(0.5, '#0d1527');
        skyGrad.addColorStop(0.8, '#162035');
        skyGrad.addColorStop(1, '#090f1a');
      } else if (params.weather === 'SNOW') {
        // Cold winter overcast sky
        skyGrad.addColorStop(0, '#090e1a');
        skyGrad.addColorStop(0.5, '#121a2c');
        skyGrad.addColorStop(0.8, '#1d273a');
        skyGrad.addColorStop(1, '#0e1524');
      } else {
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(0.5, '#0f172a');
        skyGrad.addColorStop(0.8, '#1e293b');
        skyGrad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant Parallax Mountains / High-tech Skyline
      if (params.airDensity >= 0.2) {
        ctx.save();
        ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, groundY - 20);
        const parallaxOffset1 = (cameraX * 0.05) % 400;
        for (let x = -400; x < width + 400; x += 180) {
          const px = x - parallaxOffset1;
          const peakH = 140 + Math.sin(x * 0.012) * 60;
          ctx.lineTo(px, groundY - peakH);
          ctx.lineTo(px + 90, groundY - 30);
        }
        ctx.lineTo(width, groundY);
        ctx.lineTo(0, groundY);
        ctx.fill();

        // City skyline / wind turbines layer
        ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
        const parallaxOffset2 = (cameraX * 0.15) % 600;
        for (let x = -200; x < width + 400; x += 90) {
          const px = x - parallaxOffset2;
          const blockH = 50 + ((x * 13) % 70);
          ctx.fillRect(px, groundY - blockH - 10, 55, blockH);
        }
        ctx.restore();
      }

      // If Hyperloop mode, render tubular rib structure
      if (params.airDensity < 0.2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 3;
        const tubeSpacing = 60 * effectiveZoom;
        const tubeOffset = ((cameraX * pixelsPerMeter) % tubeSpacing + tubeSpacing) % tubeSpacing;
        for (let x = -tubeOffset; x < width + 100; x += tubeSpacing) {
          ctx.beginPath();
          ctx.ellipse(x, groundY - 60, 30 * effectiveZoom, 110 * effectiveZoom, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. CONCRETE VIADUCT & STATOR GUIDEWAY
      const trackGradeAngle = Math.atan(params.trackGrade / 100);

      ctx.save();
      // Track Elevation Incline rotation around camera
      ctx.translate(screenCenterX, screenCenterY);
      ctx.rotate(-trackGradeAngle);
      ctx.translate(-screenCenterX, -screenCenterY);

      // Elevated Pillars
      const pillarInterval = 40; // meters
      const firstPillarX = Math.floor((cameraX - width / (2 * pixelsPerMeter)) / pillarInterval) * pillarInterval;
      const lastPillarX = Math.ceil((cameraX + width / (2 * pixelsPerMeter)) / pillarInterval) * pillarInterval;

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;

      for (let px = firstPillarX; px <= lastPillarX; px += pillarInterval) {
        const sx = worldToScreenX(px);
        const sy = worldToScreenY(0);
        // Concrete column
        ctx.fillRect(sx - 12, sy, 24, height - sy);
        ctx.strokeRect(sx - 12, sy, 24, height - sy);
        
        // Pillar footing cap
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx - 20, sy - 6, 40, 8);
        ctx.fillStyle = '#1e293b';

        // Distance marker text
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${(px / 1000).toFixed(1)} km`, sx - 16, sy + 32);
      }

      // Concrete Guideway Deck Beam
      const deckY = worldToScreenY(0);
      const deckGrad = ctx.createLinearGradient(0, deckY - 14, 0, deckY + 45);
      deckGrad.addColorStop(0, '#334155');
      deckGrad.addColorStop(0.3, '#1e293b');
      deckGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = deckGrad;
      ctx.fillRect(-200, deckY - 12, width + 400, 48);

      // Top Steel Reaction Rail (where bogie levitates or slides)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-200, deckY - 14, width + 400, 4);

      // Stator Core Teeth (Linear Synchronous Motor winding slots)
      const statorSlotWidth = 1.2 * effectiveZoom;
      const statorPitch = 2.4 * effectiveZoom;
      const statorOffset = ((cameraX * pixelsPerMeter) % statorPitch + statorPitch) % statorPitch;

      ctx.fillStyle = '#0284c7';
      for (let sx = -statorOffset; sx < width + 50; sx += statorPitch) {
        // Visual magnetic wave modulation along stator coils
        const waveX = (sx + cameraX * pixelsPerMeter) / (25 * effectiveZoom);
        const waveIntensity = 0.5 + 0.5 * Math.sin(waveX - state.statorPhase);
        ctx.fillStyle = waveIntensity > 0.6 ? '#38bdf8' : '#0369a1';
        ctx.fillRect(sx, deckY - 8, statorSlotWidth, 8);
      }

      // Station Platforms at km 0, 5.0, 10.0
      const stationInterval = 5000; // every 5 km
      const stationX = Math.round(state.x / stationInterval) * stationInterval;
      if (Math.abs(state.x - stationX) < 300) {
        const stnScreenX = worldToScreenX(stationX);
        const stnDeckY = worldToScreenY(0);
        // Modern glass & steel canopy platform
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(stnScreenX - 180, stnDeckY - 85, 360, 70);
        ctx.strokeRect(stnScreenX - 180, stnDeckY - 85, 360, 70);

        // Platform edge yellow safety line
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(stnScreenX - 180, stnDeckY - 16, 360, 4);

        // Station signage
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
        ctx.fillText(`GA ĐỆM TỪ TRUNG TÂM · MAGLEV STATION ${(stationX / 1000).toFixed(0)}K`, stnScreenX - 150, stnDeckY - 55);
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('VỊ TRÍ ĐỖ CHUẨN XÁC [± 0.50 M]', stnScreenX - 70, stnDeckY - 35);
      }

      ctx.restore(); // Restore track inclination

      // 3. MAGLEV TRAIN RENDERING
      ctx.save();
      // Train Position in Screen Space
      const trainScreenX = worldToScreenX(state.x);
      // Levitation gap: state.y is in mm. Convert mm to pixels:
      // (1000 mm = 1 m => (state.y / 1000) * pixelsPerMeter)
      const gapPixels = (state.y / 1000) * pixelsPerMeter;
      const trainScreenY = worldToScreenY(0) - 14 - gapPixels;

      ctx.translate(trainScreenX, trainScreenY);
      ctx.rotate(-trackGradeAngle + state.pitch);

      const carCount = params.carriages;
      const carLengthPx = 160 * effectiveZoom;
      const carHeightPx = 38 * effectiveZoom;

      // Draw each carriage starting from rear to front
      for (let c = carCount - 1; c >= 0; c--) {
        const carX = -c * (carLengthPx + 8 * effectiveZoom);
        const isLocomotive = c === 0;

        // A. Bogies & Levitation Electromagnets (Under carriage)
        const bogieY = 2;
        const bogieWidth = 46 * effectiveZoom;
        const bogieHeight = 16 * effectiveZoom;

        // Front and rear bogie positions per car
        const bogieOffsets = [-carLengthPx * 0.18, -carLengthPx * 0.82];

        bogieOffsets.forEach((bo) => {
          const bx = carX + bo;
          // Bogie frame
          ctx.fillStyle = '#334155';
          ctx.fillRect(bx - bogieWidth / 2, bogieY, bogieWidth, bogieHeight);

          // Electromagnet coil windings (copper color)
          ctx.fillStyle = '#ea580c';
          for (let coil = -bogieWidth / 2 + 4; coil < bogieWidth / 2 - 4; coil += 8 * effectiveZoom) {
            ctx.fillRect(bx + coil, bogieY + 4, 5 * effectiveZoom, bogieHeight - 6);
          }

          // Gap measurement laser sensor (high-tech red/emerald laser beam)
          ctx.save();
          ctx.strokeStyle = state.y <= 2 ? '#ef4444' : state.y < params.targetGap * 0.7 ? '#f59e0b' : '#10b981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx, bogieY + bogieHeight);
          ctx.lineTo(bx, bogieY + bogieHeight + gapPixels);
          ctx.stroke();
          ctx.restore();

          // Auxiliary landing wheels for EDS mode
          if (params.levitationMode === 'EDS') {
            const wheelRadius = 7 * effectiveZoom;
            const wheelDeployY = state.wheelsDeployed ? bogieHeight + wheelRadius - 2 : bogieHeight - 4;

            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx - 12 * effectiveZoom, bogieY + wheelDeployY, wheelRadius, 0, Math.PI * 2);
            ctx.arc(bx + 12 * effectiveZoom, bogieY + wheelDeployY, wheelRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Mechanical emergency skid shoes (at base of bogie)
          ctx.fillStyle = '#475569';
          ctx.fillRect(bx - bogieWidth / 2 - 2, bogieY + bogieHeight - 2, bogieWidth + 4, 3);
        });

        // B. Carriage Main Body
        ctx.save();
        const bodyGrad = ctx.createLinearGradient(0, -carHeightPx, 0, 0);
        bodyGrad.addColorStop(0, '#f8fafc');
        bodyGrad.addColorStop(0.65, '#e2e8f0');
        bodyGrad.addColorStop(1, '#94a3b8');

        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        if (isLocomotive) {
          // Sleek aerodynamic aerodynamic nose cone (Bullet shape)
          ctx.moveTo(carX - carLengthPx, 0);
          ctx.lineTo(carX - carLengthPx, -carHeightPx);
          ctx.lineTo(carX - 45 * effectiveZoom, -carHeightPx);
          // Curved nose taper
          ctx.bezierCurveTo(
            carX - 10 * effectiveZoom, -carHeightPx,
            carX + 40 * effectiveZoom, -carHeightPx * 0.5,
            carX + 60 * effectiveZoom, -4
          );
          ctx.lineTo(carX + 50 * effectiveZoom, 0);
          ctx.lineTo(carX - carLengthPx, 0);
        } else {
          // Standard passenger carriage
          ctx.roundRect(carX - carLengthPx, -carHeightPx, carLengthPx, carHeightPx, [4, 4, 0, 0]);
        }
        ctx.fill();
        ctx.stroke();

        // Speed livery accent stripe (Vibrant cyan/navy high-speed racing stripe)
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(carX - carLengthPx + 4, -carHeightPx * 0.45, isLocomotive ? carLengthPx + 20 * effectiveZoom : carLengthPx - 8, 5 * effectiveZoom);

        // Windows with warm passenger interior illumination
        const windowY = -carHeightPx * 0.82;
        const windowH = carHeightPx * 0.28;
        const windowW = 14 * effectiveZoom;
        const windowSpacing = 20 * effectiveZoom;

        ctx.fillStyle = 'rgba(254, 243, 199, 0.9)'; // Warm illuminated glass
        for (let wx = carX - carLengthPx + 16 * effectiveZoom; wx < carX - 35 * effectiveZoom; wx += windowSpacing) {
          ctx.fillRect(wx, windowY, windowW, windowH);
        }

        // Locomotive Cockpit Panoramic Windshield
        if (isLocomotive) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(carX - 25 * effectiveZoom, -carHeightPx * 0.9);
          ctx.lineTo(carX + 15 * effectiveZoom, -carHeightPx * 0.5);
          ctx.lineTo(carX + 10 * effectiveZoom, -carHeightPx * 0.35);
          ctx.lineTo(carX - 25 * effectiveZoom, -carHeightPx * 0.35);
          ctx.closePath();
          ctx.fill();

          // HUIT Logo Emblem Decal on Locomotive
          if (logoImgRef.current) {
            ctx.save();
            const logoSize = Math.max(12, 14 * effectiveZoom);
            const logoCenterX = carX - 10 * effectiveZoom;
            const logoCenterY = -carHeightPx * 0.28;
            // Circular crisp white backing
            ctx.beginPath();
            ctx.arc(logoCenterX, logoCenterY, logoSize / 2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#0284c7';
            ctx.stroke();
            // Logo image clipped to circle
            ctx.beginPath();
            ctx.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              logoImgRef.current,
              logoCenterX - logoSize / 2,
              logoCenterY - logoSize / 2,
              logoSize,
              logoSize
            );
            ctx.restore();
          }

          // Headlight LED Beams
          ctx.save();
          const lightX = carX + 52 * effectiveZoom;
          const lightY = -8;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(lightX, lightY, 3.5 * effectiveZoom, 0, Math.PI * 2);
          ctx.fill();

          // Forward Projected Light Beam
          const beamGrad = ctx.createRadialGradient(lightX, lightY, 2, lightX + 220 * effectiveZoom, lightY, 240 * effectiveZoom);
          beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          beamGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
          beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(lightX, lightY - 2);
          ctx.lineTo(lightX + 320 * effectiveZoom, lightY - 70);
          ctx.lineTo(lightX + 320 * effectiveZoom, lightY + 60);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Articulated Gangway Bellows between cars
        if (c > 0) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(carX - 8 * effectiveZoom, -carHeightPx + 4, 8 * effectiveZoom, carHeightPx - 6);
        }

        ctx.restore();
      }

      // 4. MAGNETIC FLUX LINES VISUALIZATION
      if (showFluxLines) {
        ctx.save();
        const fieldStrength = params.bogieMagneticField;
        const fluxCount = 14;
        const bogieAreaX = -carLengthPx * 0.5;

        for (let i = 0; i < fluxCount; i++) {
          const fx = bogieAreaX + (i - fluxCount / 2) * (18 * effectiveZoom);
          const phaseOffset = i * 0.45;
          const isNorth = Math.sin(state.statorPhase + phaseOffset) > 0;
          
          ctx.strokeStyle = isNorth ? 'rgba(239, 68, 68, 0.65)' : 'rgba(59, 130, 246, 0.65)';
          ctx.lineWidth = 1.5 + (fieldStrength / 5.0) * 1.5;

          // Looping magnetic flux arc between bogie electromagnet and track stator
          ctx.beginPath();
          ctx.moveTo(fx - 6, 12);
          ctx.bezierCurveTo(
            fx - 14, 14 + gapPixels * 0.5,
            fx + 14, 14 + gapPixels * 0.5,
            fx + 6, 14 + gapPixels
          );
          ctx.stroke();

          // Magnetic Polarity marker pill
          if (i % 2 === 0) {
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillStyle = isNorth ? '#f87171' : '#60a5fa';
            ctx.fillText(isNorth ? 'N' : 'S', fx - 3, 8 + gapPixels * 0.5);
          }
        }
        ctx.restore();
      }

      // 5. AERODYNAMIC STREAMLINES (Wind Tunnel View)
      if (showAerodynamics) {
        ctx.save();
        const aeroSpeed = state.v * 0.35 + 10;
        streamlinesRef.current.forEach((line) => {
          line.xOffset -= aeroSpeed * 0.05;
          if (line.xOffset < -carLengthPx * carCount - 100) {
            line.xOffset = 180 + Math.random() * 80;
            line.yOffset = -carHeightPx * 1.6 + Math.random() * (carHeightPx * 1.8);
          }

          // Curve airflow over train nose
          let curY = line.yOffset;
          if (line.xOffset > -30 && line.xOffset < 60) {
            curY -= Math.max(0, (60 - line.xOffset) * 0.3);
          }

          ctx.strokeStyle = `rgba(56, 189, 248, ${line.alpha * Math.min(1.0, state.v / 20 + 0.1)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(line.xOffset, curY);
          ctx.lineTo(line.xOffset + line.length, curY);
          ctx.stroke();
        });
        ctx.restore();
      }

      // 6. FREE BODY DIAGRAM FORCE VECTORS
      if (showForceVectors) {
        ctx.save();
        const cgX = -carLengthPx * (carCount / 2);
        const cgY = -carHeightPx * 0.5;

        // Force scaling: 1 kN ≈ 0.08 pixels on screen (clamped so arrows stay on stage)
        const forceScale = 0.00008 * effectiveZoom;

        // Helper for drawing labeled vector arrow
        const drawVector = (fx: number, fy: number, color: string, label: string) => {
          const len = Math.min(Math.hypot(fx, fy) * forceScale, 110 * effectiveZoom);
          if (len < 4) return;
          const angle = Math.atan2(fy, fx);

          ctx.save();
          ctx.translate(cgX, cgY);
          ctx.rotate(angle);

          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 2.5;

          // Arrow line
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(len, 0);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.moveTo(len, 0);
          ctx.lineTo(len - 8, -4);
          ctx.lineTo(len - 8, 4);
          ctx.closePath();
          ctx.fill();

          // Label
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillText(label, len + 6, 3);
          ctx.restore();
        };

        // 1. Gravity (Down)
        drawVector(0, state.forces.gravity, '#ef4444', `Fg: ${(state.forces.gravity / 1000).toFixed(0)} kN`);
        // 2. Levitation Lift (Up)
        drawVector(0, -state.forces.lift, '#06b6d4', `F_lift: ${(state.forces.lift / 1000).toFixed(0)} kN`);
        // 3. LSM Thrust (Forward)
        if (Math.abs(state.forces.thrust) > 500) {
          const isThrustFwd = state.forces.thrust > 0;
          drawVector(state.forces.thrust, 0, isThrustFwd ? '#10b981' : '#f59e0b', `F_prop: ${(state.forces.thrust / 1000).toFixed(0)} kN`);
        }
        // 4. Aerodynamic Drag (Opposing V)
        if (Math.abs(state.forces.drag) > 500) {
          drawVector(state.forces.drag, 0, '#fb923c', `F_drag: ${(Math.abs(state.forces.drag) / 1000).toFixed(0)} kN`);
        }
        // 5. Skid Friction
        if (state.contact && Math.abs(state.forces.friction) > 500) {
          drawVector(-state.forces.friction, 0, '#eab308', `F_friction: ${(state.forces.friction / 1000).toFixed(0)} kN`);
        }

        ctx.restore();
      }

      ctx.restore(); // Restore train translation

      // 7. PARTICLES: Sparks on rail contact
      if (state.contact && state.v > 8) {
        const contactX = trainScreenX - carLengthPx * 0.4;
        const contactY = worldToScreenY(0) - 10;
        for (let s = 0; s < 3; s++) {
          sparksRef.current.push({
            x: contactX + (Math.random() * 20 - 10),
            y: contactY,
            vx: -state.v * 0.1 - Math.random() * 8,
            vy: -Math.random() * 6 - 2,
            life: 1.0,
            maxLife: 0.3 + Math.random() * 0.3,
            color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
          });
        }
      }

      // Update & render sparks
      ctx.save();
      sparksRef.current = sparksRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity on sparks
        p.life -= 0.04;

        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.life * 2.5), 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });
      ctx.restore();

      // 7B. DYNAMIC WEATHER SYSTEM (RAIN & SNOW)
      if (params.weather !== 'CLEAR' && params.airDensity >= 0.2) {
        ctx.save();
        const relV = state.v - params.windSpeed;
        // Slanted angle increases with relative train speed
        const rainSlant = Math.max(-1.8, Math.min(1.8, (relV / 35) * 0.85));

        if (params.weather === 'RAIN') {
          // Dynamic rain streaks with velocity slant
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
          ctx.lineWidth = 1.3;

          weatherParticlesRef.current.forEach((wp) => {
            wp.y += wp.speed * 0.75;
            wp.x -= rainSlant * (wp.speed * 0.6);

            // Wrap around screen boundaries
            if (wp.y > height) {
              wp.y = -20;
              wp.x = Math.random() * width;
              // Spawn splash on ground or train surface occasionally
              if (Math.random() < 0.12 && splashesRef.current.length < 35) {
                splashesRef.current.push({
                  x: wp.x,
                  y: groundY - 14 + Math.random() * 20,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 3 - 1,
                  life: 1.0,
                  color: 'rgba(186, 230, 253, 0.65)',
                });
              }
            }
            if (wp.x < -100) wp.x = width + 50;
            if (wp.x > width + 100) wp.x = -50;

            ctx.beginPath();
            ctx.moveTo(wp.x, wp.y);
            ctx.lineTo(wp.x - rainSlant * wp.length, wp.y + wp.length);
            ctx.stroke();
          });

          // Render water splash droplets
          splashesRef.current = splashesRef.current.filter((sp) => {
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.vy += 0.25; // gravity on droplets
            sp.life -= 0.08;
            if (sp.life > 0) {
              ctx.fillStyle = sp.color;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 1.4 * sp.life, 0, Math.PI * 2);
              ctx.fill();
              return true;
            }
            return false;
          });
        } else if (params.weather === 'SNOW') {
          // Dynamic fluttering snowflakes
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          weatherParticlesRef.current.forEach((wp) => {
            wp.drift += 0.025;
            wp.y += wp.speed * 0.15;
            // Harmonic sway + wind turbulence
            const sway = Math.sin(wp.drift) * 1.6;
            wp.x -= (relV * 0.09) + sway;

            if (wp.y > height) {
              wp.y = -10;
              wp.x = Math.random() * width;
            }
            if (wp.x < -60) wp.x = width + 40;
            if (wp.x > width + 60) wp.x = -40;

            ctx.beginPath();
            ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      }

      // 8. ONSCREEN WATERMARK & SCALE BAR
      ctx.save();
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      const scaleBarMeters = 50;
      const scaleBarPx = scaleBarMeters * pixelsPerMeter;
      const scaleBarX = width - 24 - scaleBarPx;
      ctx.fillRect(scaleBarX, height - 28, scaleBarPx, 3);
      ctx.fillText(`${scaleBarMeters} m`, scaleBarX, height - 34);

      // Camera view mode tag (kept below the telemetry card, which owns the top-left corner)
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillText(`CAM: ${cameraMode} · ZOOM: ${zoom.toFixed(2)}x · KHOẢNG CÁCH: ${(state.x / 1000).toFixed(2)} km`, 24, 96);

      // Weather status indicator tag
      if (params.airDensity < 0.2) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('ỐNG CHÂN KHÔNG HYPERLOOP · KHÔNG KHÍ TRIỆT TIÊU', 24, 114);
      } else if (params.weather === 'RAIN') {
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('THỜI TIẾT: 🌧️ MƯA LỚN (Cản khí động +8% · Ray ướt -15% ma sát)', 24, 114);
      } else if (params.weather === 'SNOW') {
        ctx.fillStyle = '#a5b4fc';
        ctx.fillText('THỜI TIẾT: ❄️ BÃO TUYẾT (Cản khí động +6% · Ray băng -28% ma sát)', 24, 114);
      }
      ctx.restore();

      ctx.restore(); // Restore initial canvas state

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, params, cameraMode, showFluxLines, showAerodynamics, showForceVectors, manualOffset, zoom]);

  const resetView = () => {
    setManualOffset({ x: 0, y: 0 });
    setZoom(1.0);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full block"
      />

      {/* Floating Canvas Quick Controls (Zero-pill, unified glass toolbar) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto z-20">
        {topRightContent}
        {onCycleWeather && params.airDensity >= 0.2 && (
          <button
            onClick={onCycleWeather}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
              params.weather === 'RAIN'
                ? 'bg-blue-950/90 border-blue-500/80 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : params.weather === 'SNOW'
                ? 'bg-indigo-950/90 border-indigo-400/80 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="Nhấp để đổi thời tiết (Quang đãng / Mưa rào / Bão tuyết)"
          >
            <span>
              {params.weather === 'RAIN' ? '🌧️' : params.weather === 'SNOW' ? '❄️' : '☀️'}
            </span>
            <span className="hidden lg:inline">
              {params.weather === 'RAIN'
                ? 'Mưa (+8% Cản)'
                : params.weather === 'SNOW'
                ? 'Tuyết (+6% Cản)'
                : 'Quang đãng'}
            </span>
          </button>
        )}
        <button
          onClick={resetView}
          className="hidden lg:block px-2.5 py-1 text-xs font-mono bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg shadow transition-colors"
          title="Đặt lại góc nhìn camera"
        >
          Đặt lại góc nhìn
        </button>
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-slate-900/90 border-slate-800 text-slate-500'
                : 'bg-slate-900/90 border-sky-800/80 text-sky-400'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Touchdown / Skid Alert Banner */}
      {state.contact && (
        state.wheelsDeployed ? (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-mono rounded pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>BÁNH XE PHỤ EDS ĐANG ĐỠ TÀU · CHƯA ĐẠT TỐC ĐỘ CẤT CÁNH (~137 km/h)</span>
          </div>
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-red-950/90 border border-red-500/70 text-red-200 text-xs font-mono rounded pointer-events-none animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>CẢNH BÁO: CHẠM RAY / GUỐC TRƯỢT MA SÁT ĐANG HOẠT ĐỘNG (AIR GAP = 0)</span>
          </div>
        )
      )}
    </div>
  );
};
