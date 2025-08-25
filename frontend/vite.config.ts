import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		host: true,
		port: 5173,
		// proxy /api/* to the backend service (docker service name 'backend' in compose)
		proxy: {
			// mirrors the nginx behavior in prod: /api/query -> /query on backend
			'/api': {
				target: 'http://backend:4321',
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/api/, '')
			}
		}
	}
})
