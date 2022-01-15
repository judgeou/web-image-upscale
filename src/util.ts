const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

function pickColor (imageData: ImageData, x: number, y: number) {
  const { width, height, data } = imageData
  x = clamp(x, 0, width - 1)
  y = clamp(y, 0, height - 1)
  const index = x * 4 + (y * 4 * width)
  
  return [ data[index], data[index + 1], data[index + 2], data[index + 3] ]
}

function getNumberFactor (num1: number, num2: number, factor: number) {
  let a = num2 - num1
  return num1 + (a * factor)
}

function getColorFromFactor (color1: number[], color2: number[], factor: number) {
  return [
    getNumberFactor(color1[0], color2[0], factor),
    getNumberFactor(color1[1], color2[1], factor),
    getNumberFactor(color1[2], color2[2], factor),
    getNumberFactor(color1[3], color2[3], factor)
  ]
}

function sampleNearest (srcImageData: ImageData, u: number, v: number) {
  let { data: srcData, width: srcWidth, height: srcHeight } = srcImageData
  const srcX = Math.round(srcWidth * u)
  const srcY = Math.round(srcHeight * v)

  return pickColor(srcImageData, srcX, srcY)
}

function sampleLinear (srcImageData: ImageData, u: number, v: number) {
  /**
  a1 ---c1------ a2
  |     |         |
  |     c3        |
  |     |         |
  |     |         |
  a3 ---c2------ a4 
  */

  let { data: srcData, width: srcWidth, height: srcHeight } = srcImageData
  const x = srcWidth * u
  const y = srcHeight * v

  const a1x = x | 0
  const a1y = y | 0
  const a2x = a1x + 1
  const a2y = a1y
  const a3x = a1x
  const a3y = a1y + 1
  const a4x = a2x
  const a4y = a3y

  const xFactor = x - a1x
  const yFactor = y - a1y

  const a1_color = pickColor(srcImageData, a1x, a1y)
  const a2_color = pickColor(srcImageData, a2x, a2y)
  const a3_color = pickColor(srcImageData, a3x, a3y)
  const a4_color = pickColor(srcImageData, a4x, a4y)

  const c1_color = getColorFromFactor(a1_color, a2_color, xFactor)
  const c2_color = getColorFromFactor(a3_color, a4_color, xFactor)
  const c3_color = getColorFromFactor(c1_color, c2_color, yFactor)

  return c3_color
}

function upscale_nearest (srcImageData: ImageData, destImageData: ImageData) {
  let { data: destData, width: destWidth, height: destHeight } = destImageData

  for (let i = 0; i < destWidth * destHeight; i++) {
    const destX = (i % destWidth)
    const destY = i / destWidth

    const pixels = sampleNearest(srcImageData, destX / destWidth, destY / destHeight)

    destData[i * 4] = pixels[0]
    destData[i * 4 + 1] = pixels[1]
    destData[i * 4 + 2] = pixels[2]
    destData[i * 4 + 3] = pixels[3]
  }
}

function upscale_linear (srcImageData: ImageData, destImageData: ImageData) {
  let { data: destData, width: destWidth, height: destHeight } = destImageData

  for (let i = 0; i < destWidth * destHeight; i++) {
    const destX = i % destWidth
    const destY = i / destWidth

    const pixels = sampleLinear(srcImageData, destX / destWidth, destY / destHeight)

    destData[i * 4] = pixels[0]
    destData[i * 4 + 1] = pixels[1]
    destData[i * 4 + 2] = pixels[2]
    destData[i * 4 + 3] = pixels[3]
  }
}

export {
  upscale_nearest,
  upscale_linear
}
