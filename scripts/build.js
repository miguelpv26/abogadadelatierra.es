/* ==========================================================================
   build.js — inline CSS into index.html to remove the render-blocking request
   No dependencies. 
   ========================================================================== */
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const root = path.resolve(__dirname, '..')
const cssPath = path.join(root, 'assets', 'css', 'style.css')
const htmlPath = path.join(root, 'index.html')
const headersPath = path.join(root, '_headers')

let css = fs.readFileSync(cssPath, 'utf8')

// Font URLs are relative to assets/css/; once inlined into the root HTML they
// must resolve from the site root, so rewrite ../fonts/ → /assets/fonts/.
css = css.replace(/url\((['"]?)\.\.\/fonts\//g, 'url($1/assets/fonts/')

// Conservative minify: drop comments, collapse whitespace runs to one space.
css = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim()

let html = fs.readFileSync(htmlPath, 'utf8')
const marker = /(<style id="inline-css">)[\s\S]*?(<\/style>)/
if (!marker.test(html)) {
  console.error('ERROR: <style id="inline-css"></style> marker not found in index.html')
  process.exit(1)
}
html = html.replace(marker, (_, open, close) => open + css + close)
fs.writeFileSync(htmlPath, html)

console.log(`Inlined ${css.length} bytes of CSS into index.html`)

// Keep the CSP style-src hash in _headers in sync with the inlined CSS.
// The browser hashes the exact text content of <style id="inline-css">, which
// is precisely `css`, so we hash the same string here.
const hash = crypto.createHash('sha256').update(css, 'utf8').digest('base64')
const cspHash = `'sha256-${hash}'`

let headers = fs.readFileSync(headersPath, 'utf8')
const styleSrc = /style-src 'self' '(?:sha256-[^']*|BUILD_INJECTS_HASH)'/
if (!styleSrc.test(headers)) {
  console.error("ERROR: style-src token not found in _headers (expected \"style-src 'self' 'sha256-…'\")")
  process.exit(1)
}
headers = headers.replace(styleSrc, `style-src 'self' ${cspHash}`)
fs.writeFileSync(headersPath, headers)

console.log(`Updated _headers CSP style-src with ${cspHash}`)
