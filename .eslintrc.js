module.exports = {
  env: {
    browser: true,
    node: false,
  },
  extends: ['sanity/react', 'sanity/typescript', 'plugin:prettier/recommended'],
  overrides: [
    {
      files: ['*.{ts,tsx}'],
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['.eslintrc.js', 'lib/**/*', 'vite.config.ts'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-unused-vars': 1,
    'no-undef': 0,
    'no-warning-comments': 0,
    'react/display-name': 0,
    'no-unused-vars': 'off',
    'require-await': 0,
    'no-empty-function': 0,
    'no-param-reassign': 0,
    '@typescript-eslint/no-shadow': 'error',
    'no-shadow': 'off',
    camelcase: 0,
  },
  settings: {
    'import/ignore': ['.*node_modules.*', '.*:.*'],
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
}
