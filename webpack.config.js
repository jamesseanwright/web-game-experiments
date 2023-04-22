const path = require("path");

module.exports = ({ project }) => ({
  mode: "development",
  devtool: "inline-source-map",
  watch: true,
  entry: `./src/${project}/index.ts`,
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
      },
    ],
  },
});
