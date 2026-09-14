const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const DefinePlugin = require('webpack').DefinePlugin;

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  if (isDevelopment) {
    console.log('Development mode - monkey_patch');
  }

  return {
    mode: argv.mode,
    devtool: isDevelopment ? 'inline-source-map' : false,
    experiments: {
      outputModule: true,
    },

    entry: {
      debug: './src/monkey_patch/debug.ts',
    },

    output: {
      path: path.resolve(__dirname, 'npm-dist'),
      filename: '[name].js',
      library: {
        type: 'module',
      },
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

    optimization: {
      minimize: !isDevelopment,
      sideEffects: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            compress: {
              passes: 5,
              drop_debugger: true,
              reduce_funcs: true,
              reduce_vars: true,
              keep_fargs: false,
              keep_infinity: true,
              toplevel: true,
            },
            mangle: {
              toplevel: true,
              properties: false,
            },
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
