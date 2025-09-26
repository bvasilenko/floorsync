import React, { useRef, useEffect, useCallback } from 'react';
import * as PIXI from 'pixi.js';

import { useAuthStore } from '../stores/authStore';
import { useFloorPlanViewStore } from '../stores/ui/floorPlanViewStore';
import { FLOOR_PLAN_CONSTANTS } from '../constants';
import type { TaskDocument, TaskCoordinates } from '../types';
import { throttle } from '../utils/async';
import FPSCounter from './FPSCounter';

interface FloorPlanViewProps {
  onTaskCreate?: (coordinates: TaskCoordinates) => void;
}

class FloorPlanRenderer {
  private pixiApp: PIXI.Application | null = null;
  private contentContainer: PIXI.Container | null = null;
  private floorPlanSprite: PIXI.Sprite | null = null;
  private markerContainer: PIXI.Container | null = null;
  private markerTextures: Map<string, PIXI.Graphics> = new Map();

  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private contentStartPos: { x: number; y: number } | null = null;

  private clickStartPosition: { x: number; y: number } | null = null;

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

    this.contentContainer = new PIXI.Container();
    this.markerContainer = new PIXI.Container();

    this.pixiApp.stage.addChild(this.contentContainer);
    this.contentContainer.addChild(this.markerContainer);

    this.enableDragPanning();

    container.appendChild(this.pixiApp.canvas);

    await this.loadFloorPlan('/sample-floor-plan.png');
  }

  private enableDragPanning(): void {
    if (!this.contentContainer || !this.pixiApp) {
      return;
    }

    this.contentContainer.interactive = true;
    this.contentContainer.cursor = 'grab';

    this.pixiApp.stage.interactive = true;

    this.contentContainer.on('pointerdown', this.onDragStart.bind(this));
    this.pixiApp.stage.on('pointermove', this.onDragMove.bind(this));
    this.pixiApp.stage.on('pointerup', this.onDragEnd.bind(this));
    this.pixiApp.stage.on('pointerupoutside', this.onDragEnd.bind(this));
  }

  private onDragStart(event: PIXI.FederatedPointerEvent): void {
    if (!this.contentContainer) return;

    this.isDragging = true;
    this.dragStart = { x: event.global.x, y: event.global.y };
    this.contentStartPos = { x: this.contentContainer.x, y: this.contentContainer.y };
    this.contentContainer.cursor = 'grabbing';
  }

  private onDragMove(event: PIXI.FederatedPointerEvent): void {
    if (!this.isDragging || !this.dragStart || !this.contentStartPos || !this.contentContainer) {
      return;
    }

    const deltaX = event.global.x - this.dragStart.x;
    const deltaY = event.global.y - this.dragStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 5) {
      this.contentContainer.x = this.contentStartPos.x + deltaX;
      this.contentContainer.y = this.contentStartPos.y + deltaY;
    }
  }

  private onDragEnd(): void {
    if (!this.contentContainer) return;

    this.isDragging = false;
    this.dragStart = null;
    this.contentStartPos = null;
    this.contentContainer.cursor = 'grab';
  }

  private async loadFloorPlan(imagePath: string) {
    if (!this.ensureInitialized()) {
      return;
    }

    try {
      const texture = await PIXI.Assets.load(imagePath);

      if (this.floorPlanSprite) {
        this.contentContainer!.removeChild(this.floorPlanSprite);
      }

      this.floorPlanSprite = new PIXI.Sprite(texture);

      const appWidth = this.pixiApp!.screen.width;
      const appHeight = this.pixiApp!.screen.height;
      const scaleX = appWidth / texture.width;
      const scaleY = appHeight / texture.height;
      const scale = Math.min(scaleX, scaleY) * FLOOR_PLAN_CONSTANTS.FLOOR_PLAN_SCALE_FACTOR;

      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.anchor.set(0.5);
      this.floorPlanSprite.x = appWidth / 2;
      this.floorPlanSprite.y = appHeight / 2;

      this.contentContainer!.addChildAt(this.floorPlanSprite, 0);

      if (this.markerContainer) {
        this.markerContainer.scale.set(scale);
        this.markerContainer.x = appWidth / 2;
        this.markerContainer.y = appHeight / 2;
      }
    } catch (error) {
      console.error('Failed to load floor plan image:', error);
      throw error;
    }
  }

  screenToFloorPlanCoords(screenX: number, screenY: number): { x: number; y: number } | null {
    if (!this.floorPlanSprite || !this.contentContainer) {
      return null;
    }

    const adjustedScreenX = screenX - this.contentContainer.x;
    const adjustedScreenY = screenY - this.contentContainer.y;

    const bounds = this.floorPlanSprite.getBounds();
    const localBounds = this.floorPlanSprite.getLocalBounds();

    const relativeX =
      (adjustedScreenX - (bounds.x - this.contentContainer.x)) /
      (localBounds.width * this.floorPlanSprite.scale.x);
    const relativeY =
      (adjustedScreenY - (bounds.y - this.contentContainer.y)) /
      (localBounds.height * this.floorPlanSprite.scale.y);

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

    const texture = this.floorPlanSprite.texture;
    const localX = (task.coordinates.x - 0.5) * texture.width;
    const localY = (task.coordinates.y - 0.5) * texture.height;

    marker.x = localX;
    marker.y = localY;

    this.markerTextures.set(task.id, marker);
    this.markerContainer!.addChild(marker);
  }

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
    const notStartedCount = checklist.filter(item => item.status === 'not_started').length;

    // Highest priority: if any item is blocked, task is blocked (red marker)
    if (blockedCount > 0) return 'blocked';
    
    // All items done
    if (doneCount === checklist.length) return 'done';
    
    // Any item is not in initial state - task is in progress (yellow marker)  
    if (notStartedCount < checklist.length) return 'in_progress';
    
    // All items are not started
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
      this.clickStartPosition = { x: event.global.x, y: event.global.y };
    });

    this.floorPlanSprite.on('pointerup', event => {
      if (this.clickStartPosition) {
        const deltaX = event.global.x - this.clickStartPosition.x;
        const deltaY = event.global.y - this.clickStartPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance <= 5) {
          const coords = this.screenToFloorPlanCoords(event.global.x, event.global.y);
          if (coords) {
            callback(coords);
          }
        }
      }
      this.clickStartPosition = null;
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

    if (this.floorPlanSprite && this.markerContainer && this.contentContainer) {
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
  const throttler = throttle(0);

  const renderRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    app: PIXI.Application;
    renderer: FloorPlanRenderer;
    view: HTMLElement;
    handleResize: () => void;
  } | null>(null);

  const {
    tasks,
    tasksNeedingRepaint,
    userSession,
    setUserSession,
    engineReady,
    setEngineReady,
    loadTasksForFloorPlan,
    clearRepaintMarkers,
    cleanup,
  } = useFloorPlanViewStore();

  const createPerformanceTestTasks = useCallback(async () => {
    if (!userSession) {
      console.error('[ERROR] DEBUG: No user session available');
      return;
    }

    try {
      const tasksToCreate = [];

      for (let i = 0; i < 1000; i++) {
        const x = 0.1 + Math.random() * 0.8;
        const y = 0.1 + Math.random() * 0.8;

        const taskWithTemplate = {
          id: crypto.randomUUID(),
          userId: userSession.userId,
          title: `Performance Test Task ${i + 1}`,
          coordinates: { x, y },
          checklistName: 'Standard Construction Task',
          checklist: [
            {
              id: crypto.randomUUID(),
              text: 'Review specifications',
              status: 'not_started' as const,
              order: 1,
              createdAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              text: 'Prepare materials',
              status: 'not_started' as const,
              order: 2,
              createdAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              text: 'Set up work area',
              status: 'not_started' as const,
              order: 3,
              createdAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              text: 'Execute task',
              status: 'not_started' as const,
              order: 4,
              createdAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              text: 'Quality check',
              status: 'not_started' as const,
              order: 5,
              createdAt: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              text: 'Clean up',
              status: 'not_started' as const,
              order: 6,
              createdAt: new Date().toISOString(),
            },
          ],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        tasksToCreate.push(taskWithTemplate);
      }

      await userSession.database.tasks.bulkInsert(tasksToCreate);
    } catch (error) {
      console.error('[ERROR] DEBUG: Failed to create performance test tasks:', error);
    }
  }, [userSession]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).createPerformanceTestTasks = createPerformanceTestTasks;
    }

    return () => {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).createPerformanceTestTasks;
      }
    };
  }, [createPerformanceTestTasks]);

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(state => {
      setUserSession(state.userSession);

      if (state.userSession) {
        loadTasksForFloorPlan(state.userSession);
      }
    });

    const currentSession = useAuthStore.getState().userSession;
    if (currentSession) {
      setUserSession(currentSession);
      loadTasksForFloorPlan(currentSession);
    }

    return unsubscribe;
  }, [setUserSession, loadTasksForFloorPlan]);

  const stableOnTaskCreate = useCallback(
    (coords: { x: number; y: number }) => {
      if (onTaskCreate) {
        onTaskCreate(coords);
      }
    },
    [onTaskCreate]
  );

  const isRendererReady = useCallback(() => {
    return !!engineRef.current?.renderer;
  }, []);

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

    return () => {
      if (engineRef.current) {
        const { renderer, view, handleResize } = engineRef.current;

        window.removeEventListener('resize', handleResize);

        if (view.parentNode === mountElement) {
          mountElement.removeChild(view);
        }

        renderer.destroy();

        engineRef.current = null;
      }
    };
  }, [stableOnTaskCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userSession || !engineReady || !engineRef.current?.renderer) {
      return;
    }

    const renderer = engineRef.current.renderer;

    renderer.renderAllMarkers(tasks);
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

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div
      ref={renderRef}
      className="fixed inset-0 w-screen h-screen bg-gray-100 overflow-hidden"
      style={{ cursor: onTaskCreate ? 'crosshair' : 'default', touchAction: 'none' }}
    >
      <FPSCounter position="top-right" showDetails={true} />
    </div>
  );
};

export default FloorPlanView;
