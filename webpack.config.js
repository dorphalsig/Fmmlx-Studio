const path = require('path');
module.exports = {
  entry: `${path.resolve(__dirname)}/src/controllers/ViewController.ts`,

  output: {
    path: path.resolve(__dirname),
    filename: 'fmmlxstudio.js',
  },
  devtool: 'eval-source-map',
  watch: false,
  mode: 'development',
  devServer: {
    contentBase: path.resolve(__dirname),
    hot: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  module: {
    rules: [
      // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
      {test: /\.tsx?$/, use: ['ts-loader'], exclude: /node_modules/},
    ],
  },
};
