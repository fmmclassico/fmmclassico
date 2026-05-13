# FMMClassico Development Guide

This is a complete React application with Vite, Tailwind CSS, and Base44 integration.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your Base44 credentials

# 3. Start development server
npm run dev
```

Visit http://localhost:5173

## Project Structure

```
src/
├── components/ui/        # Reusable UI components
│   ├── button.jsx
│   ├── card.jsx
│   └── input.jsx
├── pages/                # Page components
│   └── Home.jsx
├── hooks/                # Custom React hooks
│   └── useApi.js
├── lib/                  # Utility functions
│   └── utils.js
├── App.jsx              # Main app component
├── main.jsx             # Entry point
├── index.css            # Global styles
└── App.css              # App styles
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Fix linting issues |
| `npm run typecheck` | Validate types |

## Tech Stack

- **React 18.2** - UI library
- **Vite 6.1** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS
- **React Router v6** - Client-side routing
- **React Query 5.84** - Data fetching and caching
- **Radix UI** - Accessible component primitives
- **Base44 SDK 0.8.28** - Backend integration
- **Lucide Icons** - Icon library

## Component Usage

### Button
```jsx
import { Button } from '@/components/ui/button'

<Button>Click Me</Button>
<Button variant="outline">Outline</Button>
```

### Card
```jsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Input
```jsx
import { Input } from '@/components/ui/input'

<Input placeholder="Enter text..." />
<Input type="email" placeholder="Email..." />
```

## Data Fetching

Use the `useFetch` hook for API calls:

```jsx
import { useFetch } from '@/hooks/useApi'

export default function MyComponent() {
  const { data, isLoading, error } = useFetch('items', async () => {
    return fetch(`${import.meta.env.VITE_BASE44_APP_BASE_URL}/api/items`)
      .then(r => r.json())
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>{JSON.stringify(data)}</div>
}
```

## Adding New Pages

1. Create a new file in `src/pages/MyPage.jsx`:

```jsx
export default function MyPage() {
  return <h1>My Page</h1>
}
```

2. Add route in `src/App.jsx`:

```jsx
import MyPage from './pages/MyPage'

// Inside Routes component:
<Route path="/my-page" element={<MyPage />} />
```

3. Add link in header or use `Link`:

```jsx
import { Link } from 'react-router-dom'

<Link to="/my-page">My Page</Link>
```

## Styling

This project uses Tailwind CSS. Add styles using className:

```jsx
<div className="flex flex-col gap-4 p-6 bg-slate-900 rounded-lg">
  <h2 className="text-2xl font-bold text-white">Hello</h2>
  <p className="text-slate-400">This is styled with Tailwind</p>
</div>
```

## Environment Variables

Create `.env.local` with:

```
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_APP_BASE_URL=https://your-backend-url.db.app
```

Access in code:

```jsx
const appId = import.meta.env.VITE_BASE44_APP_ID
const baseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL
```

## Building for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production build.

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
npm run build
# Deploy dist/ folder to GitHub Pages
```

## PWA Support

The app includes PWA manifest at `manifest.json`. To add PWA features:

1. Create `public/sw.js` for service worker
2. Register in `src/main.jsx`:

```jsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

## Troubleshooting

### Port Already in Use
```bash
npm run dev -- --port 3000
```

### Build Errors
```bash
rm -rf node_modules
npm install
npm run build
```

### Styling Issues
- Clear Tailwind cache: `npx tailwindcss purge`
- Check `tailwind.config.js` content paths

## Getting Help

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind Docs](https://tailwindcss.com)
- [Base44 Docs](https://docs.db.com)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run dev`
4. Run linting: `npm run lint:fix`
5. Commit and push
6. Create a pull request

---

Happy coding! 🚀
