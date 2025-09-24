import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';

import { useTaskStore, taskStoreRx } from '../stores/taskStore';
import { authStoreRx } from '../stores/authStore';
import { useReactiveComponent } from '../hooks/useReactiveComponent';
import { FLOOR_PLAN_CONSTANTS } from '../constants';
import type { TaskDocument, TaskCoordinates, UserSession } from '../types';

interface FloorPlanViewProps {
  onTaskCreate?: (coordinates: TaskCoordinates) => void;
}

const markerContainerId = 0;

/* Debug throttle function - preserved for future use */
const throttle = (windowMs: number) => {
  let throttleHandle: number | null = null
  return (func: () => void) => {
    if (throttleHandle) {
      clearTimeout(throttleHandle)
    }
    throttleHandle = setTimeout(() => func(), windowMs);
  };
};

let instanceId = 0

/* PixiJS renderer for performance-optimized marker rendering */
class FloorPlanRenderer {
  public instanceId = instanceId++
  private pixiApp: PIXI.Application | null = null;
  private floorPlanSprite: PIXI.Sprite | null = null;
  private markerContainer: PIXI.Container | null = null;
  private markerTextures: Map<string, PIXI.Graphics> = new Map();

  constructor() {

  }

  get app(): PIXI.Application | null {
    return this.pixiApp;
  }

  get canvas(): HTMLCanvasElement | null {
    return this.pixiApp?.canvas ?? null;
  }

  private ensureInitialized(): boolean {
    if (!this.pixiApp) {
      // console.error(`!!! FloorPlanRenderer ( pixiApp is null - initialization required )`);
      return false;
    }
    return true;
  }

  private ensureMarkerContainer(): boolean {
    if (!this.markerContainer) {
      // console.error(`!!! FloorPlanRenderer ( markerContainer is null - initialization required )`);
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
    
    marker.lineStyle(FLOOR_PLAN_CONSTANTS.MARKER_BORDER_WIDTH, FLOOR_PLAN_CONSTANTS.MARKER_BORDER_COLOR);
    marker.drawCircle(0, 0, FLOOR_PLAN_CONSTANTS.MARKER_RADIUS);
    
    this.makeInteractive(marker, 'pointer');
    
    return marker;
  }

  getElementDimensions(element: HTMLElement): { width: number; height: number } {
    const { width, height } = element.getBoundingClientRect();
    return {
      width: width || FLOOR_PLAN_CONSTANTS.DEFAULT_WIDTH,
      height: height || FLOOR_PLAN_CONSTANTS.DEFAULT_HEIGHT
    };
  }

  private logError(methodName: string, userMessage: string, error?: unknown): void {
    // Debug: method caller tracking  
    void methodName; // Preserve parameter for debugging
    console.error(userMessage, error);
  }

  private validateRelativeCoordinates(relativeX: number, relativeY: number, methodName: string): boolean {
    // Debug: method caller tracking
    void methodName; // Preserve parameter for debugging
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
      powerPreference: 'high-performance'
    });



    this.markerContainer = new PIXI.Container();
    (this.markerContainer as PIXI.Container & { markerContainerId: number })['markerContainerId'] = markerContainerId;

    this.pixiApp.stage.addChild(this.markerContainer);
    container.appendChild(this.pixiApp.canvas);

    await this.loadFloorPlan('/sample-floor-plan.png');
    
    const marker = this.createMarkerGraphics("in_progress");
    marker.x = 450;
    marker.y = 450;

    if (this.instanceId == 2 && (this.markerContainer as PIXI.Container & { markerContainerId: number })['markerContainerId'] == 2) {
      this.markerContainer!.addChild(marker);
    }
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

        this.pixiApp!.stage.addChild(this.markerContainer);
      }
      

    } catch (error) {
      this.logError('loadFloorPlan', 'Failed to load floor plan image:', error);

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


    if (!this.validateRelativeCoordinates(relativeX, relativeY, 'screenToFloorPlanCoords')) {
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
      y: bounds.y + y * bounds.height
    };

    return result;
  }

  /* O(n) initial, O(1) React complexity */
  renderAllMarkers(tasks: TaskDocument[]): void {

    if (!this.ensureMarkerContainer()) {
      console.log('!!! NOOOO')
      return;
    }

    

    this.markerContainer!.removeChildren();

    this.markerTextures.clear();


    tasks.forEach((task) => {

      this.renderSingleMarker(task);
    });

  }

  private renderSingleMarker(task: TaskDocument) {

    if (!this.ensureMarkerContainer()) {
      return;
    }
    
    const screenCoords = this.floorPlanToScreenCoords(task.coordinates.x, task.coordinates.y);

    if (!screenCoords) {
      console.log('!!! NOOOOOO')
      return;
    }

    const status = this.getTaskOverallStatus(task);
    
    const marker = this.createMarkerGraphics(status);
    
    marker.x = screenCoords.x;
    marker.y = screenCoords.y;
    
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
      case 'done': return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.done;
      case 'in_progress': return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.in_progress;
      case 'blocked': return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.blocked;
      case 'final_check_awaiting': return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.final_check_awaiting;
      default: return FLOOR_PLAN_CONSTANTS.STATUS_COLORS.not_started;
    }
  }

  enableClick(callback: (coordinates: { x: number; y: number }) => void): void {

    if (!this.floorPlanSprite) {

      return;
    }

    this.makeInteractive(this.floorPlanSprite, 'crosshair');
    

    this.floorPlanSprite.on('pointerdown', (event) => {

      const coords = this.screenToFloorPlanCoords(event.global.x, event.global.y);

      if (coords) {
        callback(coords);
      }
    });
  }

  destroy(): void {

    
    // Destroy PixiJS application
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
    if (this.floorPlanSprite) {
      const texture = this.floorPlanSprite.texture;
      const scaleX = width / texture.width;
      const scaleY = height / texture.height;
      const scale = Math.min(scaleX, scaleY) * FLOOR_PLAN_CONSTANTS.FLOOR_PLAN_SCALE_FACTOR;
      
      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.x = width / 2;
      this.floorPlanSprite.y = height / 2;
    }
  }
}

let componentInstance = 0;
const FloorPlanView: React.FC<FloorPlanViewProps> = ({ onTaskCreate }) => {
  let useEffectCallN = 0;
  const { when } = useReactiveComponent();
  
  const throttler = throttle(0); // Debug throttler - preserved for future use
  
  const renderRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<{ app: PIXI.Application; renderer: FloorPlanRenderer; view: HTMLElement; handleResize: () => void } | null>(null);
  const engineRef = useRef<{ app: PIXI.Application; renderer: FloorPlanRenderer; view: HTMLElement; handleResize: () => void } | null>(null);
  
  /* Component state - ONLY updates when observables emit */
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [tasksNeedingRepaint, setTasksNeedingRepaint] = useState<Set<string>>(new Set());
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  
  const { loadAllTasks, clearRepaintMarkers } = useTaskStore();

  componentInstance++;
  console.log('!!! EXEC COMPONENT FUNC []', componentInstance, useEffectCallN)
  
  /* CONTROLLED reactivity - subscribe only to what you need */
  useEffect(() => {
    console.log('🎯 FloorPlanView: Setting up subscriptions');
    
    /* Only react to user session changes */
    when(authStoreRx.userSession$, (session) => {
      console.log('📡 FloorPlanView: userSession changed', session?.userId || 'null');
      setUserSession(session);
    });
    
    /* Only react to tasks changes */
    when(taskStoreRx.tasks$, (taskList) => {
      console.log('📡 FloorPlanView: tasks changed', taskList.length);
      setTasks(taskList);
    });
    
    /* Only react to repaint markers changes */
    when(taskStoreRx.tasksNeedingRepaint$, (repaintSet) => {
      console.log('📡 FloorPlanView: tasksNeedingRepaint changed', repaintSet.size);
      setTasksNeedingRepaint(repaintSet);
    });
  }, []); // Empty deps - stable subscriptions
  console.log('!!! EXEC COMPONENT FUNC []', componentInstance, useEffectCallN)

  /* Stable callback to prevent re-initialization cycles */
  const stableOnTaskCreate = useCallback((coords: { x: number; y: number }) => {
    if (onTaskCreate) {
      onTaskCreate(coords);
    }
  }, [onTaskCreate]);
  
  /* Helper to check if renderer is available */
  const isRendererReady = useCallback(() => {

    return !!engineRef.current?.renderer;
  }, [engine]);

  /* Initialize PixiJS renderer - stable dependencies */
  useEffect(() => {
    useEffectCallN++;
    console.log('!!! USE EFFECT []', componentInstance, useEffectCallN)

    const mountElement = renderRef.current;
    if (!mountElement) {
      return;
    }

    let endCallback = () => {
      // console.error('!!! NO CALLBACK - FAILED DESTROY ATTEMPT')
    }

    const initRenderer = async () => {
      const stopwatch = performance.now()
      try {
        const renderer = new FloorPlanRenderer();
        
        // Create wrapper div for the canvas (following proven working pattern)
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

        const obj = { app: renderer.app!, renderer, view, handleResize }
        engineRef.current = obj;
        setEngine(obj)

        endCallback = () => {

        }
        
      } catch (error) {
        console.error('Failed to initialize floor plan renderer:', error);
      }
      
    };
    
    throttler(() => {
      initRenderer();
    });

    // Cleanup function
    return () => {
      endCallback()
      
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
  }, [stableOnTaskCreate]);

  /* Reactive stream subscription - combines PixiJS init complete + RxDB task stream */
  useEffect(() => {
    
    if (!userSession || !engineRef.current?.renderer) {
      return;
    }
    
    const renderer = engineRef.current.renderer;

    setTimeout(() => {

      if (tasks && tasks.length > 0) {
        renderer.renderAllMarkers(tasks);
      }
    });
  }, [isRendererReady, userSession, tasks]);

  /* Initialize tasks when user session is available */
  useEffect(() => {
    if (userSession) {
      console.log('🚀 FloorPlanView: Loading tasks for user session');
      loadAllTasks(userSession);
    }
  }, [userSession, loadAllTasks]);

  useEffect(() => {

    
    // NOTE: Initial rendering is now handled by reactive streams subscription above
    // This useEffect is disabled to prevent duplicate rendering
    // Only repaint logic for specific markers remains active via tasksNeedingRepaint
    
  }, [tasks, isRendererReady]);

  /* Repaint changed markers when needed */
  useEffect(() => {
    if (isRendererReady() && tasksNeedingRepaint.size > 0) {
      console.log('🎨 FloorPlanView: Repainting changed markers', tasksNeedingRepaint.size);
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
    >
    </div>
  );
};

export default FloorPlanView;
