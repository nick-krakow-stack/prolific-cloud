const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('dashboard/assets/style.css', 'utf8');

assert(css.includes('.tabs'));
assert(/\.tabs\s*\{[\s\S]*justify-content:\s*flex-start;/.test(css));
assert(/@media\s*\(min-width:\s*761px\)\s*\{[\s\S]*\.tabs\s*\{[\s\S]*justify-content:\s*center;/.test(css));
assert(css.includes('overflow-x: auto'));

console.log('nav layout render contract ok');
