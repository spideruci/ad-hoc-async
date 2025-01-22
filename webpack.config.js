//@ts-check

'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig */

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context
  mode: 'none', // Keep source close to original
  entry: './src/extension.ts', // Entry point for the extension
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    vscode: 'commonjs vscode', // Exclude VS Code module
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve TypeScript and JavaScript files
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  devtool: 'nosources-source-map',
};

/** @type WebpackConfig */
const mediaConfig = {
  target: 'web', // Media files run in the browser
  mode: 'none', // Keep source close to original
  entry: './src/media/main.ts', // Entry point for media files
  output: {
    path: path.resolve(__dirname, 'dist', 'media'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve TypeScript and JavaScript files
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/, // Process CSS files
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devtool: 'nosources-source-map',
};

module.exports = [extensionConfig, mediaConfig];