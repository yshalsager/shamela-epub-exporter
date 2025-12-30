/** @type {import('prettier').Config} */
export default {
    plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    printWidth: 100,
    quoteProps: 'as-needed',
    bracketSpacing: false,
    arrowParens: 'avoid',
    overrides: [
        {
            files: '*.js',
            options: {
                tabWidth: 4,
            },
        },
        {
            files: ['*.html', '*.css'],
            options: {
                tabWidth: 2,
            },
        },
        {
            files: '*.svelte',
            options: {
                tabWidth: 4,
                parser: 'svelte',
                svelteStrictMode: false,
                svelteSortOrder: 'options-markup-scripts-styles',
                svelteIndentScriptAndStyle: false,
            },
        },
    ],
    tailwindStylesheet: './src/entrypoints/popup/app.css',
}
