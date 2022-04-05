import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import {defineConfig} from 'vite'
import path from 'path'

const excludeDeps = ['react-select']

export default defineConfig({
  build: {
    sourcemap: true,
    minify: true,
    outDir: path.resolve(__dirname, 'lib'),
    rollupOptions: {
      external: (id) => {
        return Boolean(id.startsWith('part:') || excludeDeps.some((dep) => id.startsWith(dep)))
      },
      input: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'schemas/tag': path.resolve(__dirname, 'src/schemas/tag.ts'),
        'schemas/tags': path.resolve(__dirname, 'src/schemas/tags.ts'),
        'components/Input': path.resolve(__dirname, 'src/components/Input.tsx'),
        'components/Select': path.resolve(__dirname, 'src/components/Select.tsx'),
      },
      preserveEntrySignatures: 'exports-only',
      output: [
        {
          entryFileNames: '[name].js',
          format: 'es',
        },
      ],
      plugins: [peerDepsExternal()],
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs', '.ts', '.tsx'],
      include: [],
    },
  },
})
