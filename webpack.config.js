const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')

const r = p => path.resolve(p)
module.exports = {
  mode: 'development',
  entry: './app.js',
  output: {
    path: path.resolve('./dist'),
    filename: 'vendor.js'
  },
  resolve: {
    alias: {
      compiler: r('./src/compiler'),
      core: r('./src/core'),
      shared: r('./src/shared')
    }
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html'
    })
  ]
}
