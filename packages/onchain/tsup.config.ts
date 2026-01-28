import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    compilerOptions: {
      // Skip type checking for declaration files to avoid serialization issues
      skipLibCheck: true,
    },
  },
  clean: true,
});
