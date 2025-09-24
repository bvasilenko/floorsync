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
