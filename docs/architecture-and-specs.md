# DB/BLL Architecture v12 - Performance-Optimized Database & Business Logic Layer

## Core Database Principles

### User Isolation Architecture
```typescript
// Database-per-user pattern - complete physical separation
const createUserDatabase = async (userId: string) => {
  const dbName = `floorsync_${userId}`;
  return await createRxDatabase({
    name: dbName,
    storage: getRxStorageIndexeddb(),
    eventReduce: true
  });
};
```

### Session Management Security
```typescript
interface UserSession {
  userId: string;
  database: RxDatabase;
  isActive: boolean;
}

// Secure logout with session cleanup
const logout = async () => {
  zustandStore.getState().reset();
  currentSession = null;
};
```

## Core Database Schema

### Task Schema (Flat KISS Design)
```typescript
// KISS-maximized flat schema - single entity with template data snapshot
interface TaskDocument {
  id: string;
  userId: string;           // Owner isolation
  title: string;
  coordinates: { x: number, y: number }; // IMMUTABLE - never changes after creation
  checklistName: string;    // FROM template snapshot - immutable for task independence
  checklist: Array<{
    id: string;
    text: string;           // USER EDITABLE after creation - fully independent of template
    status: 'not_started' | 'in_progress' | 'blocked' | 'final_check_awaiting' | 'done';
    order: number;
    createdAt: Date;
  }>;
  version: number;          // Schema evolution support
  createdAt: Date;
  updatedAt: Date;
}
```

### RxDB Collection Definition
```typescript
const TaskSchema: RxJsonSchema<TaskDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    title: { type: 'string', maxLength: 200 },
    coordinates: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      },
      required: ['x', 'y']
    },
    checklistName: { type: 'string', maxLength: 100 },
    checklist: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          status: { type: 'string', enum: ['not_started', 'in_progress', 'blocked', 'final_check_awaiting', 'done'] },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    version: { type: 'number' }
  },
  required: ['id', 'userId', 'title', 'coordinates', 'checklistName', 'checklist'],
  indexes: ['userId']  // Query optimization
};
```

## Business Logic Layer

### Template System (Hardcoded KISS)
```typescript
// Simple hardcoded template - no JSON imports, no TypeScript ceremony
const DEFAULT_CHECKLIST = {
  name: "Standard Construction Task",
  defaultItems: [
    { text: "Review specifications", order: 1 },
    { text: "Prepare materials", order: 2 },
    { text: "Set up work area", order: 3 },
    { text: "Execute task", order: 4 },
    { text: "Quality check", order: 5 },
    { text: "Clean up", order: 6 }
  ]
} as const;

// Direct template instantiation - no complex type inference needed
const createTaskWithTemplate = (taskData: { title: string; coordinates: { x: number; y: number } }): TaskDocument => {
  // Simple property access - direct and readable
  const checklistSnapshot = DEFAULT_CHECKLIST.defaultItems.map(item => ({
    id: crypto.randomUUID(),
    text: item.text,
    status: 'not_started' as const,
    order: item.order,
    createdAt: new Date()
  }));

  return {
    ...taskData,
    id: crypto.randomUUID(),
    userId: getCurrentUserId(),
    checklistName: DEFAULT_CHECKLIST.name,
    checklist: checklistSnapshot,
    coordinates: taskData.coordinates, // IMMUTABLE
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};
```

### Zustand Store (BLL State)
```typescript
interface TaskStore {
  // State
  tasks: TaskDocument[];
  tasksLoaded: boolean;
  userSession: UserSession | null;
  
  // PixiJS integration helpers
  tasksNeedingRepaint: Set<string>;
  
  // Database Operations
  initializeUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAllTasks: () => Promise<void>;
  
  // Task CRUD
  createTask: (taskData: { title: string; coordinates: { x: number; y: number } }) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskDocument>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Checklist Operations
  updateChecklistItemStatus: (taskId: string, itemId: string, newStatus: TaskDocument['checklist'][0]['status']) => Promise<void>;
  addChecklistItem: (taskId: string, itemText: string) => Promise<void>;
  deleteChecklistItem: (taskId: string, checklistItemId: string) => Promise<void>;
  updateChecklistItemText: (taskId: string, checklistItemId: string, newText: string) => Promise<void>;
  
  // PixiJS Integration
  markTaskForRepaint: (taskId: string) => void;
  clearRepaintMarkers: () => void;
  
  // State Management
  reset: () => void;
}
```

### Core BLL Operations
```typescript
const useTaskStore = create<TaskStore>((set, get) => ({
  // State
  tasks: [],
  tasksLoaded: false,
  userSession: null,
  tasksNeedingRepaint: new Set(),
  
  // User session initialization
  initializeUser: async (userId: string) => {
    const database = await createUserDatabase(userId);
    await database.addCollections({
      tasks: { schema: TaskSchema }
    });
    
    set({
      userSession: { userId, database, isActive: true }
    });
  },
  
  // Load-once strategy - ALL tasks cached in memory
  loadAllTasks: async () => {
    if (get().tasksLoaded) return; // Prevent redundant loads
    
    const session = get().userSession;
    const allTasks = await session.database.tasks.find().exec();
    
    set({ 
      tasks: allTasks.map(doc => doc.toJSON()), 
      tasksLoaded: true 
    });
    
    // Subscribe to changes for reactive updates
    session.database.tasks.find().$.subscribe(tasks => {
      set({ tasks: tasks.map(doc => doc.toJSON()) });
    });
  },
  
  // Secure logout with session cleanup
  logout: async () => {
    get().reset();
  },
  
  // Task creation with template instantiation
  createTask: async (taskData) => {
    const session = get().userSession;
    const taskWithTemplate = createTaskWithTemplate(taskData);
    
    await session.database.tasks.insert(taskWithTemplate);
    get().markTaskForRepaint(taskWithTemplate.id);
    
    set(state => ({
      tasks: [...state.tasks, taskWithTemplate]
    }));
  },
  
  // Checklist operations
  updateChecklistItemStatus: async (taskId, itemId, newStatus) => {
    const session = get().userSession;
    const task = await session.database.tasks.findOne(taskId).exec();
    
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    
    await task.update({ checklist: updatedChecklist, updatedAt: new Date() });
    get().markTaskForRepaint(taskId);
  },
  
  addChecklistItem: async (taskId, itemText) => {
    const session = get().userSession;
    const task = await session.database.tasks.findOne(taskId).exec();
    
    const newItem = {
      id: crypto.randomUUID(),
      text: itemText,
      status: 'not_started' as const,
      order: Math.max(...task.checklist.map(i => i.order), 0) + 1,
      createdAt: new Date()
    };
    
    await task.update({ 
      checklist: [...task.checklist, newItem],
      updatedAt: new Date()
    });
    
    get().markTaskForRepaint(taskId);
  },
  
  deleteChecklistItem: async (taskId, checklistItemId) => {
    const session = get().userSession;
    const task = await session.database.tasks.findOne(taskId).exec();
    
    const updatedChecklist = task.checklist.filter(item => item.id !== checklistItemId);
    
    await task.update({ 
      checklist: updatedChecklist,
      updatedAt: new Date()
    });
    
    get().markTaskForRepaint(taskId);
  },
  
  updateChecklistItemText: async (taskId, checklistItemId, newText) => {
    const session = get().userSession;
    const task = await session.database.tasks.findOne(taskId).exec();
    
    const updatedChecklist = task.checklist.map(item => 
      item.id === checklistItemId 
        ? { ...item, text: newText }
        : item
    );
    
    await task.update({ 
      checklist: updatedChecklist,
      updatedAt: new Date()
    });
  },

  // PixiJS integration helpers
  markTaskForRepaint: (taskId) => {
    set(state => ({
      tasksNeedingRepaint: new Set([...state.tasksNeedingRepaint, taskId])
    }));
  },
  
  clearRepaintMarkers: () => {
    set({ tasksNeedingRepaint: new Set() });
  },
  
  // Complete state reset
  reset: () => {
    set({
      tasks: [],
      tasksLoaded: false,
      userSession: null,
      tasksNeedingRepaint: new Set()
    });
  }
}));
```

## Key Architectural Principles

### 1. User Isolation Security
- **Physical Separation**: Each user gets separate IndexedDB database
- **No Cross-User Access**: Database name includes userId - prevents data leakage
- **Session Cleanup**: Zustand state reset and session nullification on logout

### 2. KISS Compliance
- **Flat Schema**: No complex relations, embedded checklists in single array
- **Hardcoded Templates**: Simple constant object, no JSON imports or TypeScript inference ceremony
- **Minimal Interfaces**: Direct property access without complex type patterns
- **Template Independence**: Tasks own checklist data after creation
- **Immutable Coordinates**: Never change after task creation

### 3. Offline-First Optimization
- **Embedded Data**: All task data in single document - no joins
- **IndexedDB Storage**: Native browser persistence
- **Event Reduce**: RxDB optimization for state synchronization
- **Load-once Strategy**: All user tasks cached in memory for instant access

### 4. Performance-Optimized Rendering Strategy
- **PixiJS Architecture**: Bypasses React reconciliation for 200+ markers
- **O(1) React complexity**: Single PixiJS container component managed by React
- **O(changed) rendering complexity**: Only changed markers get redrawn
- **Batched Marker Rendering**: All markers rendered to single texture
- **Selective Repainting**: Individual marker updates without full re-render

## React Performance Optimization

### PixiJS Rendering Strategy (Performance-Critical)
```typescript
class FloorPlanRenderer {
  private pixiApp: PIXI.Application;
  private markerSprite: PIXI.Sprite;
  private markerTexture: PIXI.RenderTexture;
  
  // Initial render - paint ALL markers to single texture
  // O(n) initial complexity, O(1) React complexity
  async renderAllMarkers(tasks: TaskDocument[]) {
    const graphics = new PIXI.Graphics();
    
    // Batch render all 200+ markers to single texture
    tasks.forEach(task => {
      this.drawMarker(graphics, task.coordinates, task.getOverallStatus());
    });
    
    // Create single sprite from all markers - React manages ONE component
    this.markerTexture = PIXI.RenderTexture.create({
      width: floorPlan.width,
      height: floorPlan.height
    });
    
    this.pixiApp.renderer.render(graphics, this.markerTexture);
    this.markerSprite = new PIXI.Sprite(this.markerTexture);
  }
  
  // Selective repaint - only update changed markers
  // O(changed) rendering complexity, bypasses React entirely
  repaintChangedMarkers(changedTaskIds: Set<string>, tasks: TaskDocument[]) {
    const graphics = new PIXI.Graphics();
    
    changedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Clear old marker area (coordinates are immutable)
        this.clearMarkerArea(graphics, task.coordinates);
        this.drawMarker(graphics, task.coordinates, task.getOverallStatus());
      }
    });
    
    // Only re-render changed areas, not entire texture
    this.pixiApp.renderer.render(graphics, this.markerTexture, false);
  }
  
  private clearMarkerArea(graphics: PIXI.Graphics, coords: {x: number, y: number}) {
    // Clear exact marker boundaries - coordinates never change
    graphics.beginFill(0x000000, 0); // Transparent
    graphics.drawRect(coords.x - 10, coords.y - 10, 20, 20);
    graphics.endFill();
  }
}
```

### React Component Integration (Performance-Optimized)
```typescript
// PixiJS integration with repaint optimization
// O(1) React complexity - single component managed by React
const FloorPlanView = () => {
  const { tasks, tasksNeedingRepaint, clearRepaintMarkers, loadAllTasks } = useTaskStore();
  const rendererRef = useRef<FloorPlanRenderer>();
  
  // Initial load and render - expensive, happens once
  useEffect(() => {
    loadAllTasks().then(() => {
      rendererRef.current.renderAllMarkers(tasks);
    });
  }, []);
  
  // Selective repaint on task updates
  // O(changed) rendering complexity
  useEffect(() => {
    if (tasksNeedingRepaint.size > 0) {
      rendererRef.current.repaintChangedMarkers(tasksNeedingRepaint, tasks);
      clearRepaintMarkers();
    }
  }, [tasksNeedingRepaint]);
  
  // Single DOM element - no React reconciliation of 200+ markers
  return <div ref={pixiContainerRef} className="floor-plan-container" />;
};
```

## Performance Analysis

### React Performance Guarantee
**Target Architecture**: **O(1) React complexity, O(changed) rendering complexity**

**Performance Benefits**:
- **React manages ONE component**: PixiJS container (not 200+ marker components)
- **No Virtual DOM reconciliation**: Direct canvas rendering bypasses React diff
- **Selective updates**: Only changed markers redrawn, not entire marker set
- **Canvas/WebGL optimization**: Native graphics performance

### Memory Usage Analysis - Evidence-Based
**❌ PREVIOUS INCORRECT CLAIM**: "Zustand caches only what's needed for UI"

**✅ CORRECTED REALITY**: Zustand stores all loaded state in memory; components can subscribe selectively to prevent unnecessary rerenders.

**Memory Footprint Calculation**:
- **200 tasks** × ~2KB per task (with embedded checklists) = **~400KB total**
- **All task data stored in Zustand memory** for instant access
- **Browser memory limits**: Multi-GB available vs <1MB app data
- **IndexedDB storage limits**: 10GiB-600GiB vs <1MB app data

**Why This Works**:
- **Tiny data volume**: <1MB total vs GiB available storage/memory
- **Offline-first requirement**: All data must be available locally anyway
- **Performance benefit**: Zero database queries during UI interactions
- **Selective subscriptions**: Components re-render only on relevant state changes

### Why Conflict Resolution is Unnecessary
**Evidence-Based Analysis**:
- **Database-per-user isolation**: `floorsync_${userId}` = no inter-user conflicts
- **Single-user offline editing**: Each user modifies only their own data
- **No concurrent access**: Users cannot access other users' databases
- **RxDB local consistency**: Handles single-user data integrity automatically

**Complex conflict strategies solve problems that don't exist in this architecture.**

## Security Model

```typescript
// User can only access their own database
const getUserTasks = async (userId: string): Promise<TaskDocument[]> => {
  const dbName = `floorsync_${userId}`;  // Physical isolation
  const db = await openDatabase(dbName);
  return await db.tasks.find({ userId }).exec();  // Double protection
};

// Session validation
const validateSession = (session: UserSession): boolean => {
  return session.isActive && 
         session.database.name.includes(session.userId) &&
         !session.database.destroyed;
};
```

This architecture ensures **User A never accesses data of User B** through:
1. Separate IndexedDB databases per user
2. Database names containing userId
3. Session cleanup with Zustand state reset on logout
4. No shared state between user sessions

## Performance Validation Requirements

**CRITICAL**: This architecture makes performance claims about handling 200+ markers efficiently. **These claims MUST be validated with concrete measurements.**

```typescript
const performanceTest = {
  // Test 1: Initial render of 200+ markers
  measureInitialRender: () => {
    const start = performance.now();
    renderAllMarkers(generate200Tasks());
    const end = performance.now();
    console.log(`Initial render: ${end - start}ms`);
  },
  
  // Test 2: Selective repaint performance
  measureSelectiveRepaint: () => {
    const start = performance.now();
    repaintChangedMarkers(new Set(['task1', 'task5', 'task10']));
    const end = performance.now();
    console.log(`Selective repaint: ${end - start}ms`);
  },
  
  // Test 3: React reconciliation measurement
  measureReactComplexity: () => {
    const start = performance.now();
    // React reconciles ONLY PixiJS container, not 200+ markers
    ReactDOM.render(<FloorPlanView />, container);
    const end = performance.now();
    console.log(`React reconciliation: ${end - start}ms`);
  },
  
  // Test 4: Memory usage validation
  measureMemoryUsage: () => {
    const memBefore = performance.memory?.usedJSHeapSize || 0;
    loadAllTasks(); // Load 200+ tasks into Zustand
    const memAfter = performance.memory?.usedJSHeapSize || 0;
    console.log(`Memory increase: ${(memAfter - memBefore) / 1024}KB`);
  },
  
  // Test 5: Schema access performance (KISS validation)
  measureSchemaAccess: () => {
    const tasks = generate200Tasks();
    const start = performance.now();
    
    // Direct access (flat schema)
    tasks.forEach(task => {
      const title = task.title;            // Direct
      const x = task.coordinates.x;        // Direct
      const status = task.checklist[0].status; // Direct
    });
    
    const end = performance.now();
    console.log(`Direct field access: ${end - start}ms`);
  }
};
```

**Evidence Required**: 
- Initial render <100ms for 200 markers
- Selective repaint <10ms for individual marker updates
- React reconciliation <5ms (single component)
- Memory usage <1MB for all task data in Zustand
- PixiJS texture memory <50MB for marker rendering
- Direct field access performance benefit over nested schemas

**If performance targets are not met, fallback to marker clustering or viewport culling immediately.**

## Schema Evolution Strategy

```typescript
// Version-based migration (type-safe)
type TaskSchemaV1 = {
  version: 1;
  // Current fields
}

type TaskSchemaV2 = {
  version: 2;
  // Enhanced fields - e.g., priority, attachments
}

type TaskSchema = TaskSchemaV1 | TaskSchemaV2;
```

## Component Integration Pattern

```typescript
// Simple, direct access - no template lookups needed
const TaskView = ({ taskId }: { taskId: string }) => {
  const { tasks } = useTaskStore();
  const task = tasks.find(t => t.id === taskId);
  
  return (
    <div>
      <h1>{task.title}</h1>
      <p>Checklist: {task.checklistName}</p>
      {/* Direct field access - KISS benefit */}
    </div>
  );
};
```

## Performance Architecture Summary

**Target Performance Characteristics**:
1. **O(1) React complexity**: Single PixiJS component managed by React
2. **O(changed) rendering complexity**: Only changed markers redrawn  
3. **Canvas/WebGL optimization**: Direct graphics rendering
4. **Memory efficiency**: ~400KB for 200+ tasks
5. **Selective updates**: Individual marker repainting
6. **Database-per-user isolation**: No conflict resolution needed

**Evolution Strategy**: 
- Phase 1: Load-once pattern with PixiJS batched rendering + performance validation
- Phase 2: Add marker clustering for 500+ tasks if needed
- Phase 3: Implement texture atlasing for different marker types
- Phase 4: Add viewport culling only if memory becomes an issue
- Phase 5: Schema evolution through version-based union types (only when requirements change)

This architecture prioritizes **performance-critical rendering** while maintaining **KISS principles** and **security-first user isolation**.

## Simplified Template Structure

**Hardcoded Template Pattern** - Maximum KISS:
```typescript
// Simple constant object - no files, no imports, no TypeScript ceremony
const DEFAULT_CHECKLIST = {
  name: "Standard Construction Task",
  defaultItems: [
    { text: "Review specifications", order: 1 },
    { text: "Prepare materials", order: 2 },
    { text: "Set up work area", order: 3 },
    { text: "Execute task", order: 4 },
    { text: "Quality check", order: 5 },
    { text: "Clean up", order: 6 }
  ]
} as const;
```

**Simplified Template Benefits**:
1. **No file system dependency**: Template lives in code, not external JSON
2. **No TypeScript inference ceremony**: Direct property access, simple types
3. **No build complexity**: Constant object available immediately
4. **Easy modification**: Change template by editing constant object
5. **Runtime independence**: Tasks still own their checklist data after creation

**Template Usage Pattern**:
1. **Task creation**: Template data copied directly from constant
2. **Runtime**: Tasks fully independent - no template references
3. **User editing**: Direct task.checklist operations - template never consulted again
4. **Future evolution**: Add multiple template constants if needed