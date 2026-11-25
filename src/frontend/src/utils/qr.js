const SIZE = 21

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function finderState(row, column) {
  const origins = [
    [0, 0],
    [0, SIZE - 7],
    [SIZE - 7, 0],
  ]

  for (const [originRow, originCol] of origins) {
    const localRow = row - originRow
    const localCol = column - originCol
    if (localRow < 0 || localRow > 6 || localCol < 0 || localCol > 6) continue
    const onOuterRing =
      localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6
    const inInnerSquare =
      localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4
    return onOuterRing || inInnerSquare
  }
  return null
}

export function buildQrMatrix(value) {
  const seed = hashString(value)
  return Array.from({ length: SIZE * SIZE }, (_, index) => {
    const row = Math.floor(index / SIZE)
    const col = index % SIZE
    const finder = finderState(row, col)
    if (finder !== null) return finder
    const noise =
      (seed ^ Math.imul(row + 3, 374761393) ^ Math.imul(col + 7, 668265263)) >>> 0
    return (noise >>> ((row + col) % 13)) % 3 === 0
  })
}

export function downloadQrSvg(value, filename = 'splitnest-qr.svg') {
  const cells = buildQrMatrix(value)
  const quiet = 2
  const total = SIZE + quiet * 2
  const rects = cells
    .map((dark, index) => {
      if (!dark) return ''
      const row = Math.floor(index / SIZE) + quiet
      const col = (index % SIZE) + quiet
      return `<rect x="${col}" y="${row}" width="1" height="1" fill="#2c2536"/>`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="512" height="512"><rect width="${total}" height="${total}" fill="#ffffff"/>${rects}</svg>`
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
