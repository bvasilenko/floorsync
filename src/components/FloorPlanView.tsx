import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';

import { taskStore } from '../stores/taskStore';
import { authStore } from '../stores/authStore';
import { useReactiveComponent } from '../hooks/useReactiveComponent';
import { FLOOR_PLAN_CONSTANTS } from '../constants';
import type { TaskDocument, TaskCoordinates, UserSession } from '../types';
import { throttle } from '../utils/async';

interface FloorPlanViewProps {
  onTaskCreate?: (coordinates: TaskCoordinates) => void;
}

class FloorPlanRenderer {
  private pixiApp: PIXI.Application | null = null;
  private floorPlanSprite: PIXI.Sprite | null = null;
  private markerContainer: PIXI.Container | null = null;
  private markerTextures: Map<string, PIXI.Graphics> = new Map();

  constructor() {}

  get app(): PIXI.Application | null {
    return this.pixiApp;
  }

  get canvas(): HTMLCanvasElement | null {
    return this.pixiApp?.canvas ?? null;
  }

  private ensureInitialized(): boolean {
    if (!this.pixiApp) {
      return false;
    }
    return true;
  }

  private ensureMarkerContainer(): boolean {
    if (!this.markerContainer) {
      return false;
    }
    return true;
  }

  private createMarkerGraphics(status: string): PIXI.Graphics {
    const marker = new PIXI.Graphics();
    const color = this.getStatusColor(status);

    marker.beginFill(color);
    marker.drawCircle(0, 0, FLOOR_PLAN_CONSTANTS.MARKER_RADIUS);
    marker.endFill();

    marker.lineStyle(
      FLOOR_PLAN_CONSTANTS.MARKER_BORDER_WIDTH,
      FLOOR_PLAN_CONSTANTS.MARKER_BORDER_COLOR
    );
    marker.drawCircle(0, 0, FLOOR_PLAN_CONSTANTS.MARKER_RADIUS);

    this.makeInteractive(marker, 'pointer');

    return marker;
  }

  getElementDimensions(element: HTMLElement): { width: number; height: number } {
    const { width, height } = element.getBoundingClientRect();
    return {
      width: width || FLOOR_PLAN_CONSTANTS.DEFAULT_WIDTH,
      height: height || FLOOR_PLAN_CONSTANTS.DEFAULT_HEIGHT,
    };
  }

  private validateRelativeCoordinates(relativeX: number, relativeY: number): boolean {
    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
      return false;
    }
    return true;
  }

  private makeInteractive(displayObject: PIXI.Container, cursor: 'pointer' | 'crosshair'): void {
    displayObject.interactive = true;
    displayObject.cursor = cursor;
  }

  async initialize(container: HTMLElement): Promise<void> {
    const { width, height } = this.getElementDimensions(container);

    this.pixiApp = new PIXI.Application();

    await this.pixiApp.init({
      width,
      height,
      backgroundColor: FLOOR_PLAN_CONSTANTS.BACKGROUND_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    this.markerContainer = new PIXI.Container();

    this.pixiApp.stage.addChild(this.markerContainer);
    container.appendChild(this.pixiApp.canvas);

    await this.loadFloorPlan('/sample-floor-plan.png');
  }

  private async loadFloorPlan(imagePath: string) {
    if (!this.ensureInitialized()) {
      return;
    }

    try {
      const texture = await PIXI.Assets.load(imagePath);

      if (this.floorPlanSprite) {
        this.pixiApp!.stage.removeChild(this.floorPlanSprite);
      }

      this.floorPlanSprite = new PIXI.Sprite(texture);

      /* Scale to fit container, maintain aspect ratio */
      const appWidth = this.pixiApp!.screen.width;
      const appHeight = this.pixiApp!.screen.height;
      const scaleX = appWidth / texture.width;
      const scaleY = appHeight / texture.height;
      const scale = Math.min(scaleX, scaleY) * FLOOR_PLAN_CONSTANTS.FLOOR_PLAN_SCALE_FACTOR;

      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.anchor.set(0.5);
      this.floorPlanSprite.x = appWidth / 2;
      this.floorPlanSprite.y = appHeight / 2;

      this.pixiApp!.stage.addChildAt(this.floorPlanSprite, 0);

      if (this.markerContainer) {
        /* Position marker container to match floor plan transformations */
        this.markerContainer.scale.set(scale);
        this.markerContainer.x = appWidth / 2;
        this.markerContainer.y = appHeight / 2;

        this.pixiApp!.stage.addChild(this.markerContainer);
      }
    } catch (error) {
      console.error('Failed to load floor plan image:', error);
      throw error;
    }
  }

  screenToFloorPlanCoords(screenX: number, screenY: number): { x: number; y: number } | null {
    if (!this.floorPlanSprite) {
      return null;
    }

    const bounds = this.floorPlanSprite.getBounds();

    const relativeX = (screenX - bounds.x) / bounds.width;
    const relativeY = (screenY - bounds.y) / bounds.height;

    if (!this.validateRelativeCoordinates(relativeX, relativeY)) {
      return null;
    }

    const result = { x: relativeX, y: relativeY };

    return result;
  }

  floorPlanToScreenCoords(x: number, y: number): { x: number; y: number } | null {
    if (!this.floorPlanSprite) {
      return null;
    }

    const bounds = this.floorPlanSprite.getBounds();

    const result = {
      x: bounds.x + x * bounds.width,
      y: bounds.y + y * bounds.height,
    };

    return result;
  }

  renderAllMarkers(tasks: TaskDocument[]): void {
    if (!this.ensureMarkerContainer()) {
      return;
    }

    this.markerContainer!.removeChildren();

    this.markerTextures.clear();

    tasks.forEach(task => {
      this.renderSingleMarker(task);
    });
  }

  private renderSingleMarker(task: TaskDocument) {
    if (!this.ensureMarkerContainer() || !this.floorPlanSprite) {
      return;
    }

    const status = this.getTaskOverallStatus(task);
    const marker = this.createMarkerGraphics(status);

    /* Convert relative coordinates (0-1) to floor plan local coordinates */
    const texture = this.floorPlanSprite.texture;
    const localX = (task.coordinates.x - 0.5) * texture.width;
    const localY = (task.coordinates.y - 0.5) * texture.height;

    marker.x = localX;
    marker.y = localY;

    this.markerTextures.set(task.id, marker);
    this.markerContainer!.addChild(marker);
  }

  /* Selective repaint - O(changed) complexity */
  repaintChangedMarkers(changedTaskIds: Set<string>, tasks: TaskDocument[]): void {
    if (!this.ensureMarkerContainer()) {
      return;
    }

    changedTaskIds.forEach(taskId => {
      const existingMarker = this.markerTextures.get(taskId);
      if (existingMarker) {
        this.markerContainer!.removeChild(existingMarker);
        this.markerTextures.delete(taskId);
      }

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        this.renderSingleMarker(task);
      }
    });
  }

  private getTaskOverallStatus(task: TaskDocument): string {
    const checklist = task.checklist;
    if (checklist.length === 0) return 'not_started';

    const doneCount = checklist.filter(item => item.status === 'done').length;
    const blockedCount = checklist.filter(item => item.status === 'blocked').length;
    const inProgressCount = checklist.filter(item => item.status === 'in_progress').length;

    if (blockedCount > 0) return 'blocked';
    if (doneCount === checklist.length) return 'done';
    if (inProgressCount > 0) return 'in_progress';
    return 'not_started';
  }

  private getStatusColor(status: string): number {
    switch (status) {
      case 'done':
        return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.done;
      case 'in_progress':
        return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.in_progress;
      case 'blocked':
        return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.blocked;
      case 'final_check_awaiting':
        return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.final_check_awaiting;
      default:
        return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.not_started;
    }
  }

  enableClick(callback: (coordinates: { x: number; y: number }) => void): void {
    if (!this.floorPlanSprite) {
      return;
    }

    this.makeInteractive(this.floorPlanSprite, 'crosshair');

    this.floorPlanSprite.on('pointerdown', event => {
      const coords = this.screenToFloorPlanCoords(event.global.x, event.global.y);

      if (coords) {
        callback(coords);
      }
    });
  }

  destroy(): void {
    if (this.pixiApp) {
      this.pixiApp.destroy(true);
    }
  }

  resize(mountElement: HTMLElement): void {
    if (!this.ensureInitialized()) {
      return;
    }

    const { width, height } = this.getElementDimensions(mountElement);
    this.pixiApp!.renderer.resize(width, height);

    if (this.floorPlanSprite && this.markerContainer) {
      const texture = this.floorPlanSprite.texture;
      const scaleX = width / texture.width;
      const scaleY = height / texture.height;
      const scale = Math.min(scaleX, scaleY) * FLOOR_PLAN_CONSTANTS.FLOOR_PLAN_SCALE_FACTOR;

      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.x = width / 2;
      this.floorPlanSprite.y = height / 2;

      /* O(1): Marker container follows floor plan transformations exactly.
         Since markers are positioned in floor plan local coordinates, they automatically
         maintain correct relative positions for all 200+ markers simultaneously */
      this.markerContainer.scale.set(scale);
      this.markerContainer.x = width / 2;
      this.markerContainer.y = height / 2;
    }
  }
}

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ onTaskCreate }) => {
  const { when } = useReactiveComponent();

  const throttler = throttle(0);

  const renderRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    app: PIXI.Application;
    renderer: FloorPlanRenderer;
    view: HTMLElement;
    handleResize: () => void;
  } | null>(null);

  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [tasksNeedingRepaint, setTasksNeedingRepaint] = useState<Set<string>>(new Set());
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [engineReady, setEngineReady] = useState<boolean>(false);

  const clearRepaintMarkers = taskStore.clearRepaintMarkers.bind(taskStore);

  useEffect(() => {
    when(authStore.userSession$, session => {
      setUserSession(session);
    });

    when(taskStore.tasks$, taskList => {
      setTasks(taskList as TaskDocument[]);
    });

    when(taskStore.tasksNeedingRepaint$, repaintSet => {
      setTasksNeedingRepaint(repaintSet as Set<string>);
    });
  });

  /* Stable callback to prevent re-initialization cycles */
  const stableOnTaskCreate = useCallback(
    (coords: { x: number; y: number }) => {
      if (onTaskCreate) {
        onTaskCreate(coords);
      }
    },
    [onTaskCreate]
  );

  /* Helper to check if renderer is available */
  const isRendererReady = useCallback(() => {
    return !!engineRef.current?.renderer;
  }, []);

  /* Initialize PixiJS renderer - stable dependencies */
  useEffect(() => {
    const mountElement = renderRef.current;
    if (!mountElement) {
      return;
    }

    const initRenderer = async () => {
      try {
        const renderer = new FloorPlanRenderer();

        const view = document.createElement('div');
        view.style.height = '100%';
        view.style.width = '100%';
        view.style.position = 'relative';
        view.tabIndex = 0; // Enable keyboard focus

        await renderer.initialize(view);

        if (!renderer.app) {
          throw new Error('PixiJS Application failed to initialize');
        }

        if (!renderer.canvas) {
          throw new Error('PixiJS Canvas failed to initialize');
        }

        mountElement.appendChild(view);

        const handleResize = () => {
          const { width, height } = renderer.getElementDimensions(mountElement);
          if (renderer.app) {
            renderer.app.renderer.resize(width, height);
            renderer.resize(mountElement);
          }
        };

        window.addEventListener('resize', handleResize);

        handleResize();

        if (stableOnTaskCreate) {
          renderer.enableClick(stableOnTaskCreate);
        }

        const obj = { app: renderer.app!, renderer, view, handleResize };
        engineRef.current = obj;
        setEngineReady(true);
      } catch (error) {
        console.error('Failed to initialize floor plan renderer:', error);
      }
    };

    throttler(() => {
      initRenderer();
    });

    // Cleanup function
    return () => {
      if (engineRef.current) {
        const { renderer, view, handleResize } = engineRef.current;

        // Remove event listeners
        window.removeEventListener('resize', handleResize);

        // Remove from DOM
        if (view.parentNode === mountElement) {
          mountElement.removeChild(view);
        }

        // Destroy renderer (this handles PixiJS app destruction internally)
        renderer.destroy();

        engineRef.current = null;
      }
    };
  }, [stableOnTaskCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Reactive stream subscription - combines PixiJS init complete + RxDB task stream */
  useEffect(() => {
    if (!userSession || !engineReady || !engineRef.current?.renderer) {
      return;
    }

    const renderer = engineRef.current.renderer;

    if (tasks && tasks.length > 0) {
      renderer.renderAllMarkers(tasks);
    }
  }, [engineReady, userSession, tasks]);

  useEffect(() => {
    if (isRendererReady() && tasksNeedingRepaint.size > 0) {
      engineRef.current!.renderer.repaintChangedMarkers(tasksNeedingRepaint, tasks);
      clearRepaintMarkers();
    }
  }, [tasksNeedingRepaint, tasks, clearRepaintMarkers, isRendererReady]);

  useEffect(() => {
    const handleResize = () => {
      if (isRendererReady() && renderRef.current) {
        engineRef.current!.renderer.resize(renderRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isRendererReady]);

  return (
    <div
      ref={renderRef}
      className="fixed inset-0 w-screen h-screen bg-gray-100 overflow-hidden"
      style={{ cursor: onTaskCreate ? 'crosshair' : 'default', touchAction: 'none' }}
    ></div>
  );
};

export default FloorPlanView;
