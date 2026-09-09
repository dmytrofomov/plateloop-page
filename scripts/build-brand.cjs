/* PlateLoop vector identity. Run with Node + sharp; no image-generation API needed. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'docs/brand');
fs.mkdirSync(dir, { recursive: true });
const colors = { pine: '#183D32', cream: '#FFF8ED', tomato: '#D44932', lime: '#DCE9A2' };
// An open plate loop and a fork share one compact silhouette.
const mark = (c = colors.pine) => `<g fill="none" stroke="${c}" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="7" d="M36 16C20 16 9 28 9 44c0 17 13 30 30 30s30-13 30-30"/><path stroke-width="5" d="M49 13v13a10 10 0 0 0 20 0V13M59 13v37"/></g>`;
const svg = (body,w=80,h=88) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const icons = {
  camera: '<path d="M8 7l2-3h4l2 3h4v13H4V7z"/><circle cx="12" cy="13" r="3.5"/>',
  voice: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  diary: '<path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v18M10 8h6M10 12h6M10 16h4"/>',
  recipe: '<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1v15M5 8h4M15 8h4M5 12h4M15 12h4"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3"/>',
  shopping: '<path d="M5 8h14l2 13H3zM8 9V6a4 4 0 0 1 8 0v3M9 15l2 2 4-4"/>',
  loop: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  privacy: '<path d="M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5zM8 12l3 3 5-6"/>',
  confirm: '<circle cx="12" cy="12" r="9"/><path d="M7 12l3 3 7-7"/>',
  text: '<path d="M3 20L9 4l6 16M5 15h8M17 12h5M19.5 12v8"/>',
  plate: '<circle cx="14" cy="12" r="8"/><circle cx="14" cy="12" r="4.5"/><path d="M3 3v7M1 3v4q2 4 4 0V3M3 10v11"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l7-7M16 5h3v3"/>'
};
async function main() {
  fs.writeFileSync(path.join(dir,'plateloop-mark.svg'), svg(mark()));
  for (const [name,bg,fg] of [['pine',colors.pine,colors.cream],['cream',colors.cream,colors.pine],['tomato',colors.tomato,colors.cream],['lime',colors.lime,colors.pine]]) {
    const body = `<rect width="512" height="512" rx="128" fill="${bg}"/><g transform="translate(98 83) scale(3.95)">${mark(fg)}</g>`;
    const source=svg(body,512,512);
    fs.writeFileSync(path.join(dir,`avatar-${name}.svg`),source);
    await sharp(Buffer.from(source)).png().toFile(path.join(dir,`avatar-${name}.png`));
  }
  for(const [name,fg] of [['dark',colors.pine],['light',colors.cream]]) {
    const lockup=svg(`<g transform="translate(0 1) scale(.88)">${mark(fg)}</g><text x="86" y="58" font-family="Arial, sans-serif" font-size="53" font-weight="700" letter-spacing="-2.8" fill="${fg}">PlateLoop</text>`,340,80);
    fs.writeFileSync(path.join(dir,`plateloop-logo-${name}.svg`),lockup);
    await sharp(Buffer.from(lockup)).resize(1360,320).png().toFile(path.join(dir,`plateloop-logo-${name}.png`));
  }
  const symbol=[];
  for(const [name,body] of Object.entries(icons)) {
    const content=`<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
    fs.writeFileSync(path.join(dir,`icon-${name}.svg`),svg(content,24,24));
    symbol.push(`<symbol id="${name}" viewBox="0 0 24 24">${content}</symbol>`);
  }
  fs.writeFileSync(path.join(dir,'icons.svg'),`<svg xmlns="http://www.w3.org/2000/svg">${symbol.join('')}</svg>`);
  const avatar=path.join(dir,'avatar-pine.svg');
  await sharp(avatar).resize(180,180).png().toFile(path.join(dir,'apple-touch-icon.png'));
  await sharp(avatar).resize(32,32).png().toFile(path.join(dir,'favicon-32.png'));
  console.log('Created 4 avatars (SVG/PNG), 2 logo lockups (SVG/PNG), 12 SVG icons, sprite, mark and favicons.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
