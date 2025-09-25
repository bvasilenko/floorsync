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

- Database-per-user isolation for security
- Offline-first data persistence with IndexedDB
- Performance-optimized rendering for 200+ floor plan markers

## Project Structure

```
src/
  components/     # React components
  stores/         # Zustand state management
  types/          # TypeScript type definitions
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
