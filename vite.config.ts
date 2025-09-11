import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix for: Cannot find name '__dirname'.
          // In an ES module context, `__dirname` is not available.
          // We can use `.` instead, which `path.resolve` will resolve
          // to the current working directory. For Vite, this is the project root.
          '@': path.resolve('.'),
        }
      }
    };
});