import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const singleReturn = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { extraReturn: 'Use at most one return statement per function.' },
  },
  create(context) {
    const hasReturn = []
    return {
      ':function'() {
        hasReturn.push(false)
      },
      ':function:exit'() {
        hasReturn.pop()
      },
      ReturnStatement(node) {
        const index = hasReturn.length - 1
        if (hasReturn[index]) context.report({ node, messageId: 'extraReturn' })
        hasReturn[index] = true
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { local: { rules: { 'single-return': singleReturn } } },
    rules: { 'local/single-return': 'error' },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['server/**/*.js', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
