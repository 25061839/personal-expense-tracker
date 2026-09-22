// 生成「个人记账」应用图标：绿色圆角方块 + 白色 ¥ 符号
// 用法：node scripts/make-icon.mjs  →  输出 resources/icon.png (1024×1024)
import { deflateSync, crc32 } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const SIZE = 1024
const SS = 2 // 2 倍超采样抗锯齿
const R = SIZE * SS

const GREEN = [16, 185, 129]

// 临时画布（超采样分辨率）
const px = new Uint8Array(R * R * 4)

/** 点到线段的距离 */
function distToSeg(px2, py2, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const t = Math.max(0, Math.min(1, ((px2 - ax) * abx + (py2 - ay) * aby) / (abx * abx + aby * aby)))
  const cx = ax + t * abx
  const cy = ay + t * aby
  return Math.hypot(px2 - cx, py2 - cy)
}

// 1. 圆角矩形背景
const M = 72 * SS
const RAD = 230 * SS
const MAX = SIZE * SS - M
for (let y = 0; y < R; y++) {
  for (let x = 0; x < R; x++) {
    const cx = Math.min(Math.max(x, M + RAD), MAX - RAD)
    const cy = Math.min(Math.max(y, M + RAD), MAX - RAD)
    if (Math.hypot(x - cx, y - cy) <= RAD) {
      const i = (y * R + x) * 4
      px[i] = GREEN[0]
      px[i + 1] = GREEN[1]
      px[i + 2] = GREEN[2]
      px[i + 3] = 255
    }
  }
}

// 2. ¥ 笔画（白色粗线段）
const W = 48 * SS
const C = 512 * SS
const strokes = [
  [400 * SS, 320 * SS, C, 470 * SS], // 左上斜线
  [624 * SS, 320 * SS, C, 470 * SS], // 右上斜线
  [C, 460 * SS, C, 700 * SS], // 竖线
  [390 * SS, 545 * SS, 634 * SS, 545 * SS], // 上横线
  [390 * SS, 645 * SS, 634 * SS, 645 * SS] // 下横线
]
const half = W / 2
for (let y = 0; y < R; y++) {
  for (let x = 0; x < R; x++) {
    const i = (y * R + x) * 4
    if (px[i + 3] === 0) continue
    for (const [ax, ay, bx, by] of strokes) {
      if (distToSeg(x, y, ax, ay, bx, by) <= half) {
        px[i] = 255
        px[i + 1] = 255
        px[i + 2] = 255
        px[i + 3] = 255
        break
      }
    }
  }
}

// 3. 降采样到 1024×1024（带 Alpha 校正，避免边缘发黑）
const out = new Uint8Array(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * R + (x * SS + dx)) * 4
        r += px[i]
        g += px[i + 1]
        b += px[i + 2]
        a += px[i + 3]
      }
    }
    const covered = a / 255
    const o = (y * SIZE + x) * 4
    if (covered > 0) {
      out[o] = Math.round(r / covered)
      out[o + 1] = Math.round(g / covered)
      out[o + 2] = Math.round(b / covered)
    }
    out[o + 3] = Math.round(a / (SS * SS))
  }
}

// 4. 编码为 PNG
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // 位深
ihdr[9] = 6 // RGBA

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // 每行过滤字节
  raw.set(out.subarray(y * SIZE * 4, (y + 1) * SIZE * 4), y * (SIZE * 4 + 1) + 1)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.png', png)
console.log('✅ 图标已生成：resources/icon.png')
