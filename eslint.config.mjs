import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config([
  { ignores: ['node_modules', 'dist', 'electron-dist', '.expo', 'android', 'ios', 'windows'] },
  {
    extends: tseslint.configs.recommended,
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      // React Native's Animated API reads ref.current during render by design (style props)
      'react-hooks/refs': 'off',
      // False positive: rule doesn't detect JSX element usage as a variable reference
      'react-hooks/purity': 'off',
      // Standard async data-fetch pattern: useEffect(() => { loadData(); }, [loadData])
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
