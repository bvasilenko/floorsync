import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { TaskDocument } from '../types';

interface FloorPlanViewProps {
  onTaskCreate?: (coordinates: { x: number; y: number }) => void;
}

/* PixiJS renderer for performance-optimized marker rendering */
class FloorPlanRenderer {
  public pixiApp: PIXI.Application | null = null;
  private floorPlanSprite: PIXI.Sprite | null = null;
  private markerContainer: PIXI.Container | null = null;
  private markerTextures: Map<string, PIXI.Graphics> = new Map();

  constructor() {
    console.log('!!! FloorPlanRenderer > constructor ( starting - no initialization )');
    console.log('!!! FloorPlanRenderer > constructor ( completed - awaiting async init )');
  }

  async initialize(container: HTMLElement) {
    console.log('!!! FloorPlanRenderer > initialize ( starting )');
    
    const { width, height } = container.getBoundingClientRect();
    console.log('!!! FloorPlanRenderer > initialize ( getBoundingClientRect width:', width, 'height:', height, ')');
    
    /* Use modern PixiJS v8 Application.init() pattern */
    console.log('!!! FloorPlanRenderer > initialize ( creating new PIXI.Application )');
    this.pixiApp = new PIXI.Application();
    
    console.log('!!! FloorPlanRenderer > initialize ( calling pixiApp.init with options )');
    await this.pixiApp.init({
      width: width || 800,
      height: height || 600,
      backgroundColor: 0xf5f5f5,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance'
    });
    console.log('!!! FloorPlanRenderer > initialize ( pixiApp.init completed )');

    /* Create and add marker container */
    console.log('!!! FloorPlanRenderer > initialize ( creating markerContainer )');
    this.markerContainer = new PIXI.Container();
    this.pixiApp.stage.addChild(this.markerContainer);

    /* Mount canvas directly to container */
    console.log('!!! FloorPlanRenderer > initialize ( mounting canvas to container )');
    container.appendChild(this.pixiApp.canvas);
    console.log('!!! FloorPlanRenderer > initialize ( canvas mounted successfully )');

    console.log('!!! FloorPlanRenderer > initialize ( starting loadFloorPlan )');
    await this.loadFloorPlan('/sample-floor-plan.png');
    console.log('!!! FloorPlanRenderer > initialize ( completed )');
  }

  private async loadFloorPlan(imagePath: string) {
    console.log('!!! FloorPlanRenderer > loadFloorPlan ( starting imagePath:', imagePath, ')');
    if (!this.pixiApp) {
      console.error('!!! FloorPlanRenderer > loadFloorPlan ( pixiApp is null - initialization required )');
      return;
    }
    
    try {
      console.log('!!! FloorPlanRenderer > loadFloorPlan ( starting PIXI.Assets.load )');
      const texture = await PIXI.Assets.load(imagePath);
      console.log('!!! FloorPlanRenderer > loadFloorPlan ( PIXI.Assets.load completed texture width:', texture.width, 'height:', texture.height, ')');
      
      if (this.floorPlanSprite) {
        console.log('!!! FloorPlanRenderer > loadFloorPlan ( removing existing floorPlanSprite )');
        this.pixiApp.stage.removeChild(this.floorPlanSprite);
      }

      console.log('!!! FloorPlanRenderer > loadFloorPlan ( creating new PIXI.Sprite )');
      this.floorPlanSprite = new PIXI.Sprite(texture);
      
      /* Scale to fit container, maintain aspect ratio */
      const appWidth = this.pixiApp.screen.width;
      const appHeight = this.pixiApp.screen.height;
      const scaleX = appWidth / texture.width;
      const scaleY = appHeight / texture.height;
      const scale = Math.min(scaleX, scaleY) * 0.9;
      console.log('!!! FloorPlanRenderer > loadFloorPlan ( scaling calculations scaleX:', scaleX, 'scaleY:', scaleY, 'final scale:', scale, ')');
      
      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.anchor.set(0.5);
      this.floorPlanSprite.x = appWidth / 2;
      this.floorPlanSprite.y = appHeight / 2;

      console.log('!!! FloorPlanRenderer > loadFloorPlan ( addChildAt adding sprite to stage at index 0 )');
      this.pixiApp.stage.addChildAt(this.floorPlanSprite, 0);
      
      if (this.markerContainer) {
        console.log('!!! FloorPlanRenderer > loadFloorPlan ( addChild adding markerContainer to stage )');
        this.pixiApp.stage.addChild(this.markerContainer);
      }
      
      console.log('!!! FloorPlanRenderer > loadFloorPlan ( completed successfully floor plan sprite added to stage )');
    } catch (error) {
      console.error('!!! loadFloorPlan > catch block ( error:', error, ')');
      console.error('Failed to load floor plan image:', error);
      console.log('!!! FloorPlanRenderer > loadFloorPlan ( throwing error re-throwing for parent )');
      throw error;
    }
  }

  screenToFloorPlanCoords(screenX: number, screenY: number): { x: number; y: number } | null {
    console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords ( screenX:', screenX, 'screenY:', screenY, ')');
    if (!this.floorPlanSprite) {
      console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords > null return ( no floorPlanSprite )');
      return null;
    }

    const bounds = this.floorPlanSprite.getBounds();
    console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords > getBounds ( bounds.x:', bounds.x, 'bounds.y:', bounds.y, 'bounds.width:', bounds.width, 'bounds.height:', bounds.height, ')');
    
    const relativeX = (screenX - bounds.x) / bounds.width;
    const relativeY = (screenY - bounds.y) / bounds.height;
    console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords > calculated relatives ( relativeX:', relativeX, 'relativeY:', relativeY, ')');

    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
      console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords > null return ( coordinates outside bounds )');
      return null;
    }

    const result = { x: relativeX, y: relativeY };
    console.log('!!! FloorPlanRenderer > screenToFloorPlanCoords > return ( result:', result, ')');
    return result;
  }

  floorPlanToScreenCoords(x: number, y: number): { x: number; y: number } | null {
    console.log('!!! FloorPlanRenderer > floorPlanToScreenCoords ( x:', x, 'y:', y, ')');
    if (!this.floorPlanSprite) {
      console.log('!!! FloorPlanRenderer > floorPlanToScreenCoords > null return ( no floorPlanSprite )');
      return null;
    }

    const bounds = this.floorPlanSprite.getBounds();
    console.log('!!! FloorPlanRenderer > floorPlanToScreenCoords > getBounds ( bounds.x:', bounds.x, 'bounds.y:', bounds.y, 'bounds.width:', bounds.width, 'bounds.height:', bounds.height, ')');
    
    const result = {
      x: bounds.x + x * bounds.width,
      y: bounds.y + y * bounds.height
    };
    console.log('!!! FloorPlanRenderer > floorPlanToScreenCoords > return ( result:', result, ')');
    return result;
  }

  /* O(n) initial, O(1) React complexity */
  renderAllMarkers(tasks: TaskDocument[]) {
    console.log('!!! FloorPlanRenderer > renderAllMarkers ( tasks count:', tasks.length, ')');
    if (!this.markerContainer) {
      console.error('!!! FloorPlanRenderer > renderAllMarkers ( markerContainer is null - initialization required )');
      return;
    }
    
    console.log('!!! FloorPlanRenderer > renderAllMarkers > removeChildren ( clearing existing markers )');
    this.markerContainer.removeChildren();
    console.log('!!! FloorPlanRenderer > renderAllMarkers > clear textures ( clearing markerTextures map )');
    this.markerTextures.clear();

    console.log('!!! FloorPlanRenderer > renderAllMarkers > forEach loop ( starting to render', tasks.length, 'markers )');
    tasks.forEach((task, index) => {
      console.log('!!! FloorPlanRenderer > renderAllMarkers > forEach task', index, '( taskId:', task.id, 'coordinates:', task.coordinates, ')');
      this.renderSingleMarker(task);
    });
    console.log('!!! FloorPlanRenderer > renderAllMarkers ( completed rendering', tasks.length, 'markers )');
  }

  private renderSingleMarker(task: TaskDocument) {
    console.log('!!! FloorPlanRenderer > renderSingleMarker ( taskId:', task.id, 'coordinates:', task.coordinates, ')');
    if (!this.markerContainer) {
      console.error('!!! FloorPlanRenderer > renderSingleMarker ( markerContainer is null - initialization required )');
      return;
    }
    
    const screenCoords = this.floorPlanToScreenCoords(task.coordinates.x, task.coordinates.y);
    console.log('!!! FloorPlanRenderer > renderSingleMarker > floorPlanToScreenCoords ( screenCoords:', screenCoords, ')');
    if (!screenCoords) {
      console.log('!!! FloorPlanRenderer > renderSingleMarker > early return ( screenCoords is null )');
      return;
    }

    console.log('!!! FloorPlanRenderer > renderSingleMarker > new PIXI.Graphics ( creating marker graphics )');
    const marker = new PIXI.Graphics();
    
    const status = this.getTaskOverallStatus(task);
    const color = this.getStatusColor(status);
    console.log('!!! FloorPlanRenderer > renderSingleMarker > status and color ( status:', status, 'color:', color.toString(16), ')');
    
    console.log('!!! FloorPlanRenderer > renderSingleMarker > drawing circle ( beginFill, drawCircle, endFill )');
    marker.beginFill(color);
    marker.drawCircle(0, 0, 12);
    marker.endFill();
    
    console.log('!!! FloorPlanRenderer > renderSingleMarker > drawing border ( lineStyle, drawCircle )');
    marker.lineStyle(2, 0xffffff);
    marker.drawCircle(0, 0, 12);

    console.log('!!! FloorPlanRenderer > renderSingleMarker > setting position ( x:', screenCoords.x, 'y:', screenCoords.y, ')');
    marker.x = screenCoords.x;
    marker.y = screenCoords.y;
    marker.interactive = true;
    marker.cursor = 'pointer';

    console.log('!!! FloorPlanRenderer > renderSingleMarker > storing in textures map ( taskId:', task.id, ')');
    this.markerTextures.set(task.id, marker);
    console.log('!!! FloorPlanRenderer > renderSingleMarker > addChild ( adding to markerContainer )');
    this.markerContainer.addChild(marker);
    console.log('!!! FloorPlanRenderer > renderSingleMarker ( completed for taskId:', task.id, ')');
  }

  /* Selective repaint - O(changed) complexity */
  repaintChangedMarkers(changedTaskIds: Set<string>, tasks: TaskDocument[]) {
    if (!this.markerContainer) {
      console.error('!!! FloorPlanRenderer > repaintChangedMarkers ( markerContainer is null - initialization required )');
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
      case 'done': return 0x10b981; // green
      case 'in_progress': return 0xf59e0b; // yellow
      case 'blocked': return 0xef4444; // red
      case 'final_check_awaiting': return 0x3b82f6; // blue
      default: return 0x6b7280; // gray
    }
  }

  enableClick(callback: (coordinates: { x: number; y: number }) => void) {
    console.log('!!! FloorPlanRenderer > enableClick ( callback provided:', !!callback, ')');
    if (!this.floorPlanSprite) {
      console.log('!!! FloorPlanRenderer > enableClick > early return ( no floorPlanSprite )');
      return;
    }

    console.log('!!! FloorPlanRenderer > enableClick > setting interactive and cursor ( interactive: true, cursor: crosshair )');
    this.floorPlanSprite.interactive = true;
    this.floorPlanSprite.cursor = 'crosshair';
    
    console.log('!!! FloorPlanRenderer > enableClick > addEventListener ( adding pointerdown listener to floorPlanSprite )');
    this.floorPlanSprite.on('pointerdown', (event) => {
      console.log('!!! FloorPlanRenderer > enableClick > pointerdown event ( event.global.x:', event.global.x, 'event.global.y:', event.global.y, ')');
      const coords = this.screenToFloorPlanCoords(event.global.x, event.global.y);
      console.log('!!! FloorPlanRenderer > enableClick > screenToFloorPlanCoords result ( coords:', coords, ')');
      if (coords) {
        console.log('!!! FloorPlanRenderer > enableClick > callback ( calling with coordinates:', coords, ')');
        callback(coords);
      } else {
        console.log('!!! FloorPlanRenderer > enableClick > skip callback ( coords is null )');
      }
    });
  }

  destroy() {
    console.log('!!! FloorPlanRenderer > destroy ( starting )');
    
    // Destroy PixiJS application
    if (this.pixiApp) {
      this.pixiApp.destroy(true);
    }
    
    console.log('!!! FloorPlanRenderer > destroy ( completed )');
  }

  resize(mountElement: HTMLElement) {
    if (!this.pixiApp) {
      console.error('!!! FloorPlanRenderer > resize ( pixiApp is null - initialization required )');
      return;
    }
    
    const { width, height } = mountElement.getBoundingClientRect();
    this.pixiApp.renderer.resize(width || 800, height || 600);
    if (this.floorPlanSprite) {
      const texture = this.floorPlanSprite.texture;
      const scaleX = (width || 800) / texture.width;
      const scaleY = (height || 600) / texture.height;
      const scale = Math.min(scaleX, scaleY) * 0.9;
      
      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.x = (width || 800) / 2;
      this.floorPlanSprite.y = (height || 600) / 2;
    }
  }
}

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ onTaskCreate }) => {
  console.log('!!! FloorPlanView > component render start ( onTaskCreate:', !!onTaskCreate, ')');
  
  const renderRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ app: PIXI.Application; renderer: FloorPlanRenderer; view: HTMLElement; handleResize: () => void } | null>(null);
  const { tasks, tasksNeedingRepaint, clearRepaintMarkers, loadAllTasks } = useTaskStore();
  const { userSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('!!! FloorPlanView > component render state ( tasks count:', tasks.length, 'tasksNeedingRepaint size:', tasksNeedingRepaint.size, 'userSession:', !!userSession, 'isLoading:', isLoading, ')');

  /* Stable callback to prevent re-initialization cycles */
  const stableOnTaskCreate = useCallback((coords: { x: number; y: number }) => {
    if (onTaskCreate) {
      onTaskCreate(coords);
    }
  }, [onTaskCreate]);

  /* Initialize PixiJS renderer - stable dependencies */
  useEffect(() => {
    console.log('!!! FloorPlanView > useEffect-initRenderer trigger ( dependencies changed )');
    const mountElement = renderRef.current;
    console.log('!!! FloorPlanView > useEffect-initRenderer > renderRef.current ( mountElement:', !!mountElement, ')');
    
    if (!mountElement) {
      console.log('!!! FloorPlanView > useEffect-initRenderer > early return ( mountElement is null )');
      return;
    }
    console.log('!!! FloorPlanView > useEffect-initRenderer > mountElement exists ( proceeding with initialization )');

    const initRenderer = async () => {
      try {
        console.log('!!! FloorPlanView > initRenderer ( starting async initialization )');
        
        // Create FloorPlan renderer using proven pattern
        console.log('!!! FloorPlanView > initRenderer > new FloorPlanRenderer ( creating renderer instance )');
        const renderer = new FloorPlanRenderer();
        
        // Create wrapper div for the canvas (following proven working pattern)
        console.log('!!! FloorPlanView > initRenderer > createElement ( creating wrapper div )');
        const view = document.createElement('div');
        view.style.height = '100%';
        view.style.width = '100%';
        view.style.position = 'relative';
        view.tabIndex = 0; // Enable keyboard focus
        console.log('!!! FloorPlanView > initRenderer > wrapper div styles set ( height: 100%, width: 100%, position: relative, tabIndex: 0 )');
        
        // Initialize the renderer with the container for sizing
        console.log('!!! FloorPlanView > initRenderer > renderer.initialize ( starting renderer initialization with mountElement )');
        await renderer.initialize(mountElement);
        console.log('!!! FloorPlanView > initRenderer > renderer.initialize ( completed successfully )');
        
        /* Verify pixiApp was initialized */
        if (!renderer.pixiApp) {
          throw new Error('PixiJS Application failed to initialize');
        }
        
        // Append the PixiJS canvas to the wrapper div
        console.log('!!! FloorPlanView > initRenderer > appendChild ( appending canvas to wrapper div )');
        view.appendChild(renderer.pixiApp.canvas);
        
        // Mount to React DOM element
        console.log('!!! FloorPlanView > initRenderer > mountElement.appendChild ( mounting wrapper to React element )');
        mountElement.appendChild(view);
        
        // Handle resize using getBoundingClientRect pattern
        const handleResize = () => {
          console.log('!!! FloorPlanView > handleResize ( resize event triggered )');
          const { width, height } = mountElement.getBoundingClientRect();
          console.log('!!! FloorPlanView > handleResize > getBoundingClientRect ( width:', width, 'height:', height, ')');
          if (renderer.pixiApp) {
            renderer.pixiApp.renderer.resize(width || 800, height || 600);
            renderer.resize(mountElement);
          }
          console.log('!!! FloorPlanView > handleResize ( resize completed )');
        };
        
        console.log('!!! FloorPlanView > initRenderer > addEventListener ( adding resize listener )');
        window.addEventListener('resize', handleResize);
        console.log('!!! FloorPlanView > initRenderer > handleResize ( calling initial resize )');
        handleResize();
        
        // Enable click handling
        if (stableOnTaskCreate && onTaskCreate) {
          console.log('!!! FloorPlanView > initRenderer > renderer.enableClick ( enabling click handler with stableOnTaskCreate callback )');
          renderer.enableClick(stableOnTaskCreate);
        } else {
          console.log('!!! FloorPlanView > initRenderer > skip enableClick ( no stableOnTaskCreate callback provided )');
        }
        
        // Store references for cleanup
        console.log('!!! FloorPlanView > initRenderer > engineRef.current assignment ( storing references for cleanup )');
        engineRef.current = { app: renderer.pixiApp!, renderer, view, handleResize };
        console.log('!!! FloorPlanView > initRenderer > setIsLoading(false) ( marking initialization complete )');
        setIsLoading(false);
        console.log('!!! FloorPlanView > initRenderer ( completed successfully )');
        
      } catch (error) {
        console.error('!!! FloorPlanView > initRenderer > catch block ( error occurred:', error, ')');
        console.error('Failed to initialize floor plan renderer:', error);
        console.log('!!! FloorPlanView > initRenderer > setIsLoading(false) ( marking failed initialization complete )');
        setIsLoading(false);
      }
    };

    console.log('!!! FloorPlanView > useEffect-initRenderer > initRenderer() call ( starting async initialization )');
    initRenderer();

    // Cleanup function following proven working pattern
    return () => {
      console.log('!!! FloorPlanView > useEffect-initRenderer cleanup ( cleanup function triggered )');
      if (engineRef.current) {
        console.log('!!! FloorPlanView > cleanup > engineRef.current exists ( proceeding with cleanup )');
        const { renderer, view, handleResize } = engineRef.current;
        
        console.log('!!! FloorPlanView > cleanup > removeEventListener ( removing resize listeners )');
        // Remove event listeners
        window.removeEventListener('resize', handleResize);
        
        console.log('!!! FloorPlanView > cleanup > removeChild ( removing from DOM )');
        // Remove from DOM
        if (view.parentNode === mountElement) {
          mountElement.removeChild(view);
        }
        
        console.log('!!! FloorPlanView > cleanup > destroy ( destroying renderer and app )');
        // Destroy renderer (this handles PixiJS app destruction internally)
        renderer.destroy();
        
        engineRef.current = null;
        console.log('!!! FloorPlanView > cleanup ( completed successfully )');
      } else {
        console.log('!!! FloorPlanView > cleanup > engineRef.current is null ( no cleanup needed )');
      }
    };
  }, [stableOnTaskCreate, onTaskCreate]);

  useEffect(() => {
    console.log('!!! FloorPlanView > useEffect-loadTasks trigger ( userSession:', !!userSession, 'isLoading:', isLoading, ')');
    if (userSession && !isLoading) {
      console.log('!!! FloorPlanView > useEffect-loadTasks > loadAllTasks ( calling with userSession )');
      loadAllTasks(userSession);
    } else {
      console.log('!!! FloorPlanView > useEffect-loadTasks > skip loadAllTasks ( userSession:', !!userSession, 'isLoading:', isLoading, ')');
    }
  }, [userSession, loadAllTasks, isLoading]);

  useEffect(() => {
    console.log('!!! FloorPlanView > useEffect-renderMarkers trigger ( engineRef.current?.renderer:', !!engineRef.current?.renderer, 'tasks.length:', tasks.length, ')');
    if (engineRef.current?.renderer && tasks.length > 0) {
      console.log('!!! FloorPlanView > useEffect-renderMarkers > renderer.renderAllMarkers ( calling with', tasks.length, 'tasks )');
      engineRef.current.renderer.renderAllMarkers(tasks);
      console.log('!!! FloorPlanView > useEffect-renderMarkers > renderer.renderAllMarkers ( completed )');
    } else {
      console.log('!!! FloorPlanView > useEffect-renderMarkers > skip renderAllMarkers ( renderer:', !!engineRef.current?.renderer, 'tasks.length:', tasks.length, ')');
    }
  }, [tasks]);

  useEffect(() => {
    console.log('!!! FloorPlanView > useEffect-repaintMarkers trigger ( engineRef.current?.renderer:', !!engineRef.current?.renderer, 'tasksNeedingRepaint.size:', tasksNeedingRepaint.size, ')');
    if (engineRef.current?.renderer && tasksNeedingRepaint.size > 0) {
      console.log('!!! FloorPlanView > useEffect-repaintMarkers > renderer.repaintChangedMarkers ( calling with tasksNeedingRepaint size:', tasksNeedingRepaint.size, ')');
      engineRef.current.renderer.repaintChangedMarkers(tasksNeedingRepaint, tasks);
      console.log('!!! FloorPlanView > useEffect-repaintMarkers > clearRepaintMarkers ( clearing repaint markers )');
      clearRepaintMarkers();
      console.log('!!! FloorPlanView > useEffect-repaintMarkers ( completed repaint cycle )');
    } else {
      console.log('!!! FloorPlanView > useEffect-repaintMarkers > skip repaint ( renderer:', !!engineRef.current?.renderer, 'tasksNeedingRepaint.size:', tasksNeedingRepaint.size, ')');
    }
  }, [tasksNeedingRepaint, tasks, clearRepaintMarkers]);

  useEffect(() => {
    console.log('!!! FloorPlanView > useEffect-globalResize trigger ( setting up global resize listener )');
    const handleResize = () => {
      console.log('!!! FloorPlanView > useEffect-globalResize > handleResize ( global resize event triggered )');
      if (engineRef.current?.renderer && renderRef.current) {
        console.log('!!! FloorPlanView > useEffect-globalResize > renderer.resize ( calling with renderRef.current )');
        engineRef.current.renderer.resize(renderRef.current);
        console.log('!!! FloorPlanView > useEffect-globalResize > renderer.resize ( completed )');
      } else {
        console.log('!!! FloorPlanView > useEffect-globalResize > skip resize ( renderer:', !!engineRef.current?.renderer, 'renderRef.current:', !!renderRef.current, ')');
      }
    };

    console.log('!!! FloorPlanView > useEffect-globalResize > addEventListener ( adding global resize listener )');
    window.addEventListener('resize', handleResize);
    return () => {
      console.log('!!! FloorPlanView > useEffect-globalResize cleanup ( removing global resize listener )');
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  console.log('!!! FloorPlanView > render return ( returning main floor plan view with renderRef, isLoading:', isLoading, ')');
  return (
    <div 
      ref={renderRef}
      className="fixed inset-0 w-screen h-screen bg-gray-100 overflow-hidden"
      style={{ cursor: onTaskCreate ? 'crosshair' : 'default', touchAction: 'none' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading floor plan...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanView;
