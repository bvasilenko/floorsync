# FloorSync

Offline-first construction task management web application built with React 19.

## Tech Stack

- **React 19** with TypeScript strict mode
- **RxDB** for offline-first database
- **Zustand** for state management
- **React Router DOM** for routing
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Architecture

FloorSync follows **MVVM pattern** with dual ViewModel architecture and reactive data flow:

```
RxDB (Model) → BehaviorSubject (Data ViewModel) → React (View)
                    ↓
               Zustand (UI ViewModel) → React (View)
```

### RxDB: Reactive Model Layer
- **Reactive queries** - `.$.subscribe()` auto-updates UI when data changes
- **EventReduce optimization** - 94% query performance improvement for repeated operations  
- **Cross-tab synchronization** - Changes instantly sync across browser tabs
- **Offline-first** - Full functionality without internet connection
- **Database-per-user isolation** - Complete data separation for security

### Dual ViewModel Layer

### Dual ViewModel Layer

**BehaviorSubject (Data ViewModel)** - `taskStore.ts`, `authStore.ts`  
- **Reactive data caching** - Bridge between RxDB and React components
- **Immediate value access** - `.getValue()` for synchronous state reads
- **Subscription management** - Automatic cleanup and memory management

**Zustand (UI ViewModel)** - Page-specific stores pattern  
- **Page-specific organization** - `dashboardStore.ts`, `loginStore.ts`, `floorPlanViewStore.ts`, `taskCreationModalStore.ts`, `appStore.ts`
- **Component-scoped state** - Each page/component has dedicated Zustand store  
- **Single Responsibility** - Each store manages one component's UI state only
- **Standard React patterns** - Familiar hooks-based API replacing local `useState`

### React: View Layer
- **Component-based architecture** - Modular, reusable UI components
- **Performance-optimized rendering** - Handles 200+ floor plan markers efficiently
- **Responsive design** - Works across desktop and mobile devices

### Data Flow
1. **User action** triggers UI state change (Zustand) or data operation (BehaviorSubject)
2. **Database writes** go directly to RxDB Model layer  
3. **RxDB reactive queries** automatically emit updated data
4. **BehaviorSubject caches** emit to React components via subscription
5. **Components re-render** with updated data from reactive streams

**Key benefit**: Zero manual state synchronization. RxDB + BehaviorSubject handle all data reactivity automatically.

## Project Structure

```
src/
  components/     # React View layer - UI components
  stores/         # Dual ViewModel layer:
                  #   - BehaviorSubject (taskStore, authStore) - data caching
                  #   - Zustand (ui/* page-specific stores) - UI state per component  
  database/       # RxDB Model - reactive data layer
  types/          # TypeScript definitions
  utils/          # Helper functions
```

## Roadmap

### Floor Plan Navigation

- [ ] **Mouse wheel zooming** - Zoom in/out using mouse wheel
- [ ] **Click-and-drag panning** - Pan around floor plan by dragging
- [ ] **Trackpad pinch gestures** - Multi-touch zoom on trackpads and touch devices
- [ ] **Viewport manipulation** - Programmatic viewport control (fit-to-view, center on task, etc.)

### Future Enhancements

- [ ] Keyboard shortcuts for navigation
- [ ] Mini-map overview for large floor plans
- [ ] Smooth zoom/pan animations
- [ ] Zoom level indicators
