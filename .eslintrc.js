const { NODE_ENV } = process.env
module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
  },
  extends: '@atomix',
  env: {
    browser: true,
  },
  // add your custom rules here
  rules: {
    // allow debugger during development
    'no-debugger': NODE_ENV === 'production' ? 'error' : 'off',
    'no-console': NODE_ENV === 'production' ? 'error' : 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'import/no-default-export': 'off',
    'space-before-function-paren': ['error', 'always'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'prefer-template': [1],
  },
}