'use strict';

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a5276';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.6}px Cairo, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ح', size / 2, size / 2 + size * 0.05);

  return canvas.toBuffer('image/png');
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'icon-192.png'), generateIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generateIcon(512));

console.log('✅ Icons generated: icon-192.png, icon-512.png');
