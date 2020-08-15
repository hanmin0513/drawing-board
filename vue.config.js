module.exports = {
  /** 区分打包环境与开发环境
   * process.env.NODE_ENV==='production'  (打包环境)
   * process.env.NODE_ENV==='development' (开发环境)
   **/
  publicPath: '/',
  outputDir: 'dist',
  lintOnSave: false,
  chainWebpack: config => {
    config.resolve.symlinks(true);
  },
  configureWebpack: () => {},
  css: {
    extract: true,
    sourceMap: false,
    loaderOptions: {},
    modules: false
  },
  devServer: {
    hot: true,
    open: true,
    host: '0.0.0.0',
    port: 8080,
    https: false,
    disableHostCheck: true
  },
  // 第三方插件配置
  pluginOptions: {
    // ...
  }
};
