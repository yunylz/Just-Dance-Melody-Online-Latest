import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import Icons from 'unplugin-icons/vite';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    plugins: [
      tailwindcss(),
      sveltekit(),
      Icons({ compiler: 'svelte' }),
      vitePluginBundleObfuscator({
        enable: true, // turn on obfuscation
        autoExcludeNodeModules: true, // don’t obfuscate dependencies
        threadPool: true, // use multi-threading for faster build
        options: {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 1,
          deadCodeInjection: false,
          debugProtection: false,
          identifierNamesGenerator: 'hexadecimal', // variable/function names obfuscated
          selfDefending: true,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayCallsTransformThreshold: 0.5,
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 2,
          stringArrayWrappersType: 'variable',
          stringArrayThreshold: 0.75,
          simplify: true,
        }
      })
    ],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: { drop_console: false, drop_debugger: false },
        mangle: true
      },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    },
    css: {
      modules: {
        generateScopedName: '[hash:base64:8]', // hashed CSS class names
      }
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT) || 5173,
      allowedHosts: ["jdmo-hub.dnceprty.co", "c0llydoll.dev", "test.dnceprty.co"],
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    optimizeDeps: {
      exclude: ['@tauri-apps/api']
    },
    ssr: {
      external: ['@tauri-apps/api']
    }
  });
};

