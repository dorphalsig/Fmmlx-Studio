module.exports = {
  entry: '/Users/paavum/Documents/WebstormProjects/fmmlx-studio/src/fmmlxstudio.ts',
  output: {
    path: '/Users/paavum/Documents/WebstormProjects/fmmlx-studio/',
    filename: 'fmmlxstudio.js',
  },
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
