const HtmlWebpackPlugin = require('html-webpack-plugin'); // Require  html-webpack-plugin plugin
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const Dotenv = require('dotenv-webpack');

const ENV = process.env.APP_ENV;
const isTest = ENV === 'test'
const isProd = ENV === 'prod';

function setDevTool() {  // function to set dev-tool depending on environment
    if (isTest) {
      return 'inline-source-map';
    } else if (isProd) {
      return 'source-map';
    } else {
      return 'eval-source-map';
    }
}

const config = {
  devtool: setDevTool(),  //Set the devtool
  entry: __dirname + "/src/app/index.jsx", // webpack entry point. Module to start building dependency graph
  output: {
    path: __dirname + '/dist', // Folder to store generated bundle
    filename: 'bundle.js',  // Name of generated bundle after build
    publicPath: '/' // public URL of the output directory when referenced in a browser
  },
  node: {
    fs: 'empty',
    process: 'mock',
    Buffer: true,
  },
  module: {  // where we defined file patterns and their loaders
      rules: [
          {
            test: /\.jpe?g$|\.ico$|\.gif$|\.png$|\.woff$|\.ttf$|\.wav$|\.mp3$|\.webmanifest$|\.xml$/,
            loader: 'file-loader?name=[name].[ext]'  // <-- retain original file name
          },
          {
            test: /\.js[x]?$/,
            use: 'babel-loader',
            exclude: [
              /node_modules/
            ]
          },
          {
            test: /\.(sass|scss)$/,
            use: [{
                loader: "style-loader" // creates style nodes from JS strings
            }, {
                loader: "css-loader" // translates CSS into CommonJS
            }, {
                loader: "sass-loader" // compiles Sass to CSS
            }]
          },
          {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.svg$/,
            use: ['@svgr/webpack'],
          },
      ]
  },
  plugins: [  // Array of plugins to apply to build chunk
      new HtmlWebpackPlugin({
          template: __dirname + "/src/public/index.html",
          inject: 'body'
      }),
      new Dotenv()
  ],
  devServer: {  // configuration for webpack-dev-server
      contentBase: './src/public',  //source of static assets
      port: 7700, // port to run dev-server
  },
};

// Minify and copy assets in production
if(isProd) {  // plugins to use in a production environment
    config.plugins.push(
        new UglifyJSPlugin(),  // minify the chunk
        new CopyWebpackPlugin([{  // copy assets to public folder
          from: __dirname + '/src/public'
        }])
    );
};



module.exports = config;