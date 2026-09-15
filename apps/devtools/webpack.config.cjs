const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { DefinePlugin } = require('webpack');

// Webpack builds the three Chrome-extension "lib" bundles that the browser loads directly (the
// non-UI JS): the devtools page, the content script, and the MV3 service worker. Output goes to
// dist/lib/[name].js. The React panel UI is built separately by Vite (see vite.config.ts).
// These entries don't use React, so react/react-dom are declared as externals.
module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: argv.mode,
    devtool: isDevelopment ? 'source-map' : false,

    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },

    entry: {
      devtools_page: './src/lib/devtools_page.ts',
      content_script: './src/lib/content_script.ts',
      service_worker: './src/lib/service_worker.ts',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'lib/[name].js',
      libraryTarget: 'umd',
      globalObject: 'this',
    },

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@src': path.resolve(__dirname, 'src'),
        // Resolve the state libraries + debug patch to monorepo SOURCE (mirror vite.config.ts) so
        // the lib bundles' shared code (asserts, etc.) uses local code, not published packages.
        'react-hooks-global-states-debug': path.resolve(__dirname, '../../libs/monkey_patch/src'),
        'react-global-state-hooks': path.resolve(__dirname, '../../libs/web/src'),
        'react-hooks-global-states': path.resolve(__dirname, '../../libs/universal/src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          // transpileOnly: the extension lib bundles are simple glue (content script / service
          // worker / devtools page). Their types are already checked by `yarn ts-check` (tsc -b)
          // against the app tsconfig; re-type-checking the whole imported graph (incl. the
          // aliased monorepo source) under a separate config here is redundant and brittle.
          use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.lib.json', transpileOnly: true } }],
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
      }),
    ],
    watch: isDevelopment && !env?.['no-watch'],
    watchOptions: {
      ignored: /node_modules/,
    },
    optimization: {
      minimize: !isDevelopment,
      sideEffects: false,
      usedExports: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: { comments: isDevelopment },
            sourceMap: isDevelopment,
          },
        }),
      ],
    },
  };
};
