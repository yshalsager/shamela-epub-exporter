import css from '@eslint/css'
import js from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import {defineConfig} from 'eslint/config'
import prettier from 'eslint-config-prettier'
import {importX as import_x} from 'eslint-plugin-import-x'
import simple_import_sort from 'eslint-plugin-simple-import-sort'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts_eslint from 'typescript-eslint'

export default defineConfig([
    {ignores: ['.output/**', '.wuchale/**', '.wxt/**']},
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,svelte}'],
        extends: [
            js.configs.recommended,
            ...ts_eslint.configs.recommended,
            ...svelte.configs.recommended,
            prettier,
            ...svelte.configs.prettier,
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['src/locales/main.loader.svelte.js'],
                },
                extraFileExtensions: ['.svelte'],
                parser: ts_eslint.parser,
            },
        },
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,svelte}'],
        plugins: {
            'import-x': import_x,
            'simple-import-sort': simple_import_sort,
        },
        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'import-x/first': 'error',
            'import-x/newline-after-import': 'error',
            'import-x/no-duplicates': 'error',
            'import-x/extensions': 'off',
        },
    },
    {files: ['**/*.json'], plugins: {json}, language: 'json/json', extends: ['json/recommended']},
    {
        files: ['**/*.md'],
        plugins: {markdown},
        language: 'markdown/commonmark',
        extends: ['markdown/recommended'],
        ignores: ['docs/**'],
    },
    {
        files: ['**/*.css'],
        plugins: {css},
        language: 'css/css',
        extends: ['css/recommended'],
        rules: {
            'css/no-invalid-properties': ['error', {allowUnknownVariables: true}],
        },
    },
    {
        files: ['src/entrypoints/popup/app.css'],
        rules: {
            'css/no-invalid-at-rules': 'off',
        },
    },
])
