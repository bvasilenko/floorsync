# FloorSync

Simple offline construction task app. Click floor plan, add tasks with checklists.

## Tech Stack

- **React 19** + TypeScript strict
- **RxDB** for offline data
- **Zustand** for state  
- **React Router** for navigation
- **Tailwind** for CSS
- **PixiJS** for floor plan rendering

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run in production mode
npm run build && npm run preview

# Run linting
npm run lint
```

### Performance Testing

[Performance test video](docs/performance-test.mp4)

Run `window.createPerformanceTestTasks()` in browser console to create 1000 test tasks for performance validation.

## Architecture

RxDB handles offline data, Zustand manages UI state, React renders everything.

```
RxDB → Zustand → React
```

## Project Structure

```
src/
  components/     # UI components + icon library
  stores/         # Zustand stores:
    authStore.ts        # user auth
    ui/                 # UI-specific stores
      dashboardStore.ts       
      floorPlanViewStore.ts   
      taskCreationModalStore.ts
      checklistStore.ts
  database/       # RxDB setup
  types/          # TypeScript types
  utils/          # helper functions
```

## Roadmap

### Floor Plan Navigation

- [ ] **Mouse wheel zooming** 
- [ ] **Trackpad pinch gestures** 
- [ ] **Mobile device support** for PixiJS touch interactions
- [ ] **Viewport controls** - fit-to-view, center on task

### Future Ideas

- [ ] Keyboard shortcuts
- [ ] Mini-map for large plans
- [ ] Smooth animations
- [ ] **Collaborative mode** with WebSocket sync (Figma/GDocs style)

## Development Timeline

See [docs/timesheet.md](docs/timesheet.md) for detailed development progress:

**2025-09-24:** Research & Architecture (6hr)  
**2025-09-25:** PixiJS viewport + RxDB integration (8hr)  
**2025-09-26:** UX polish + store optimization (7hr)  

**Total:** 21 hours over 3 days
