import { getValidUrl, getHostname } from './lib/urls.ts';

const items = Array.from({ length: 1000 }, (_, i) => ({
  id: `id-${i}`,
  url: i % 2 === 0 ? `https://example.com/path/${i}` : `example.org/${i}`,
  title: null,
  note: null,
  mode: 'visible' as const
}));

function parse() {
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const validUrl = getValidUrl(items[i].url);
    const hostname = getHostname(items[i].url);
    acc += validUrl.length + hostname.length;
  }
  return acc;
}

const startParse = performance.now();
for (let i = 0; i < 100; i++) { // 100 renders
  parse();
}
const endParse = performance.now();
console.log(`Repeated URL parsing time: ${(endParse - startParse).toFixed(2)}ms`);

// Pre-computed approach
const parsedItems = items.map(item => ({
  ...item,
  validUrl: getValidUrl(item.url),
  hostname: getHostname(item.url)
}));

function preComputed() {
  let acc = 0;
  for (let i = 0; i < parsedItems.length; i++) {
    acc += parsedItems[i].validUrl.length + parsedItems[i].hostname.length;
  }
  return acc;
}

const startPreComputed = performance.now();
for (let i = 0; i < 100; i++) { // 100 renders
  preComputed();
}
const endPreComputed = performance.now();
console.log(`Pre-computed rendering time: ${(endPreComputed - startPreComputed).toFixed(2)}ms`);
