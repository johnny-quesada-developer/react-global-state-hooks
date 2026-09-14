const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const DefinePlugin = require('webpack').DefinePlugin;

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  if (isDevelopment) {
    console.log('Development mode');
  }

  return {
    mode: argv.mode,
    devtool: isDevelopment ? 'inline-source-map' : false,

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
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode),
      }),
    ],
    devtool: isDevelopment ? 'source-map' : false,
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
            format: {
              comments: isDevelopment,
            },
            sourceMap: isDevelopment,
          },
        }),
      ],
    },
  };
};
