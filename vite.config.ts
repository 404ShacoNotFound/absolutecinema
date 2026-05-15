import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({ 
    plugins: [
        tailwindcss(), 
        sveltekit(),
        basicSsl() // Generates a self-signed certificate for local HTTPS testing
    ] 
});
