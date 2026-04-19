// .lintstagedrc.cjs
module.exports = {
  'src/**/*.{ts,tsx}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [
      `bash -c 'ESLINT_USE_FLAT_CONFIG=false npx eslint --fix --max-warnings 0 ${escaped}'`,
      `npx prettier --write ${escaped}`,
    ]
  },
  'src/**/*.{json,css}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [`npx prettier --write ${escaped}`]
  },
}
