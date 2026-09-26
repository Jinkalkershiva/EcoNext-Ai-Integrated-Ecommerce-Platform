# EcoNext Frontend (Vite + React)

AI-Integrated E-Commerce Platform Frontend powered by **React 19** and **Vite**.

## Available Scripts

In the `frontend` directory, you can run:

### `npm run dev`

Runs the app in development mode with Instant HMR.\
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### `npm run build`

Builds the app for production to the `dist` folder.\
It bundles and optimizes the JavaScript and CSS assets for fast production serving.

### `npm run preview`

Locally previews the production build from the `dist` folder.\
Open [http://localhost:4173](http://localhost:4173) to view the production preview.

## Architecture

- **Build Tool**: Vite (`@vitejs/plugin-react`)
- **UI Framework**: React 19
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Toastify
- **State & Theming**: React Context (`ThemeContext`, `AuthContext`, `CartContext`, `NavigationContext`)
- **API Client**: Native `fetch` with JWT refresh token rotation (`src/api.js`)
