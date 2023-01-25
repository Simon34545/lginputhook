const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const AddAssetWebpackPlugin = require("add-asset-webpack-plugin");

module.exports = (env) => [
  // Web configuration
  {
    mode: env.production ? 'production' : 'development',

    target: 'es5',

    // Builds with devtool support (development) contain very big eval chunks,
    // which seem to cause segfaults (at least) on nodeJS v0.12.2 used on webOS 3.x.
    // This feature makes sense only when using recent enough chrome-based
    // node inspector anyway.
    devtool: false,

    entry: {
      index: './frontend/index.js',
      'service/interface/main': './service/interface/main.js',
      // userScript: './src/userScript.js',
    },
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: ({ chunk: { name } }) => (name === 'userScript') ? 'webOSUserScripts/[name].js' : '[name].js',
      chunkFormat: 'commonjs',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          use: 'babel-loader',
        },
        /*
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        */
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { context: 'assets', from: '**/*' },
          { context: 'frontend', from: 'index.html' },
        ]
      }),

      // Populate appinfo.json with package id and version
      new AddAssetWebpackPlugin('appinfo.json', (compilation) => {
        const packageJson = require('./package.json');
        const appinfoJson = require('./appinfo.json');
        return JSON.stringify({
          ...appinfoJson,
          id: packageJson.name,
          version: packageJson.version,
        });
      }),
    ],
  },
  // Service configuration
  {
    mode: env.production ? 'production' : 'development',

    target: 'node0.10',

    // Builds with devtool support (development) contain very big eval chunks,
    // which seem to cause segfaults (at least) on nodeJS v0.12.2 used on webOS 3.x.
    // This feature makes sense only when using recent enough chrome-based
    // node inspector anyway.
    devtool: false,

    entry: {
      service: './service/service.js',
    },
    output: {
      path: path.resolve(__dirname, './dist/service'),
      chunkFormat: 'commonjs',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    externals: {
      'webos-service': 'commonjs2 webos-service',
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          use: 'babel-loader',
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { context: 'service', from: '*.json' },
          { to: 'inputhook', from: './service/inputhook'},
          { to: 'interface', from: './service/interface/index.html'},
          { to: 'interface', from: './service/interface/style.css'},
        ]
      }),

      // Build services.json file
      new AddAssetWebpackPlugin('services.json', (compilation) => {
        const { name, description = name } = require('./service/package.json');

        return JSON.stringify({
          id: name,
          description,
          services: [
            { name }
          ],
        });
      }),
    ],
  },
];
