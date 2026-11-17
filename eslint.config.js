import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const buttonClass = String.raw`/(^|\s)btn(?:-(?:primary|secondary|outline|danger|ghost|sm|md))?(\s|$)/`

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['scripts/**/*.mjs', 'postcss.config.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/common/Button.tsx'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "JSXOpeningElement[name.name='button'] JSXAttribute[name.name='className'] " +
          `:matches(Literal[value=${buttonClass}], TemplateElement[value.raw=${buttonClass}])`,
        message: 'Réutiliser Button pour les actions qui reprennent les variantes du design system.',
      }],
    },
  },
])
