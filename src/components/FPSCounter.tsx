import React, { useRef, useEffect, useState } from 'react';

interface FPSCounterProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  updateInterval?: number;

  showDetails?: boolean;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({
  position = 'top-left',
  updateInterval = 250,
  showDetails = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ fps: 0, frameTime: 0 });
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let lastUpdateTime = performance.now();

    const measureFrame = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;
      frameCountRef.current++;

      frameTimesRef.current.push(deltaTime);

      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      if (now - lastUpdateTime >= updateInterval) {
        const frameTimes = frameTimesRef.current;
        if (frameTimes.length > 0) {
          const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
          const fps = Math.round(1000 / avgFrameTime);

          const newMetrics: PerformanceMetrics = {
            fps: fps,
            frameTime: Math.round(avgFrameTime * 100) / 100,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (showDetails && (performance as any).memory) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memory = (performance as any).memory;
            newMetrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          }

          setMetrics(newMetrics);
        }
        lastUpdateTime = now;
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updateInterval, showDetails]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 left-4';
    }
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 pointer-events-none select-none`}
      role="status"
      aria-label="Performance metrics"
    >
      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono">
        <div className={`font-bold ${getFPSColor(metrics.fps)}`}>{metrics.fps} FPS</div>
        {showDetails && (
          <div className="text-gray-300 text-xs space-y-1">
            <div>Frame: {metrics.frameTime}ms</div>
            {metrics.memoryUsage && <div>Memory: {metrics.memoryUsage}MB</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default FPSCounter;
