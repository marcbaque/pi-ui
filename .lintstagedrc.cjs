// .lintstagedrc.cjs
module.exports = {
  'src/**/*.{ts,tsx}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [
      `pnpm eslint --fix --max-warnings 0 ${escaped}`,
      `pnpm prettier --write ${escaped}`,
    ]
  },
  'src/**/*.{json,css}': (files) => {
    const escaped = files.map((f) => `"${f}"`).join(' ')
    return [`pnpm prettier --write ${escaped}`]
  },
}
