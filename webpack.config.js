const path = require('path');
module.exports = {
  entry: `${path.resolve(__dirname)}/src/fmmlxstudio.ts`,

  output: {
    path: path.resolve(__dirname),
    filename: 'fmmlxstudio.js',
  },
  devtool: 'eval-source-map',
  watch: false,
  mode: 'development',
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
