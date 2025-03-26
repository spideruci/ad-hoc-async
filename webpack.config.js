const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

/** @type {import('webpack').Configuration} */
module.exports = [
    // 1️⃣ Webpack Config for the VS Code Extension
    {
        target: "node", // For Node.js environment (VS Code runs extensions in Node)
        mode: "production",
        entry: "./src/extension/extension.ts",
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "extension.js",
            libraryTarget: "commonjs2",
        },
        resolve: {
            extensions: [".ts", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin({ parallel: true })], // ✅ Parallel minification
        },
        cache: {
            type: "filesystem", // ✅ Persistent cache
        },
        externals: {
            vscode: "commonjs vscode", 
        }
        
    },
    {
        target: "web",
        mode: "production",
        entry: "./src/editor-webview/index.tsx",
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "editor.js",
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
            fallback: {
                "fs": false,
                "path": require.resolve("path-browserify"),
                "os": require.resolve("os-browserify/browser"),
                "stream": require.resolve("stream-browserify"),
            },
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin({ parallel: true })], // ✅ Parallel minification
        },
        cache: {
            type: "filesystem", // ✅ Persistent cache
        },
    },
    {
        target: "web",
        mode: "production",
        entry: "./src/terminal-webview/index.tsx",
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "sidebar.js",
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
            fallback: {
                "fs": false,
                "path": require.resolve("path-browserify"),
                "os": require.resolve("os-browserify/browser"),
                "stream": require.resolve("stream-browserify"),
            },
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin({ parallel: true })], // ✅ Parallel minification
        },
        cache: {
            type: "filesystem", // ✅ Persistent cache
        },
    },
];