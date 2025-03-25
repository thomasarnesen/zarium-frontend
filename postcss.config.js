module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        "defaults",
        "not IE 11",
        "> 1%",
        "last 2 versions",
        "Firefox ESR",
        "Safari >= 10"
      ],
      grid: true
    },
  },
}