interface Point {
  x: number,
  y: number
}

function Point (x: number, y: number): Point {
  return { x, y }
}

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

function pickColor (imageData: ImageData, point: Point) {
  let { x, y } = point
  const { width, height, data } = imageData
  x = clamp(x, 0, width - 1)
  y = clamp(y, 0, height - 1)
  const index = x * 4 + (y * 4 * width)
  
  return [ data[index], data[index + 1], data[index + 2], data[index + 3] ]
}

function twoNumberLinear (num1: number, num2: number, factor: number) {
  let a = num2 - num1
  return num1 + (a * factor)
}

function fourNumberLinear (
  num1: number,
  num2: number,
  num3: number,
  num4: number,
  factor: number
) {
  const a = -num1 / 2 + (3 * num2) / 2 - (3 * num3) / 2 + num4 / 2
  const b = num1 - (5 * num2) / 2 + 2 * num3 - num4 / 2
  const c = -num1 / 2 + num3 / 2
  const d = num2

  return a * factor * factor * factor + b * factor * factor + c * factor + d;
}

function twoColorLinear (color1: number[], color2: number[], factor: number) {
  return [
    twoNumberLinear(color1[0], color2[0], factor),
    twoNumberLinear(color1[1], color2[1], factor),
    twoNumberLinear(color1[2], color2[2], factor),
    twoNumberLinear(color1[3], color2[3], factor)
  ]
}

function fourColorLinear (
  color1: number[],
  color2: number[],
  color3: number[],
  color4: number[],
  factor: number
) {
  return [
    fourNumberLinear(color1[0], color2[0], color3[0], color4[0], factor),
    fourNumberLinear(color1[1], color2[1], color3[1], color4[1], factor),
    fourNumberLinear(color1[2], color2[2], color3[2], color4[2], factor),
    fourNumberLinear(color1[3], color2[3], color3[3], color4[3], factor)
  ]
}

function sampleNearest (srcImageData: ImageData, u: number, v: number) {
  let { data: srcData, width: srcWidth, height: srcHeight } = srcImageData
  const srcX = Math.round(srcWidth * u)
  const srcY = Math.round(srcHeight * v)

  return pickColor(srcImageData, Point(srcX, srcY))
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

  const a1 = Point(x | 0, y | 0)
  const a2 = Point(a1.x + 1, a1.y)
  const a3 = Point(a1.x, a1.y + 1)
  const a4 = Point(a1.x + 1, a1.y + 1)

  const xFactor = x - a1.x
  const yFactor = y - a1.y

  const a1_color = pickColor(srcImageData, a1)
  const a2_color = pickColor(srcImageData, a2)
  const a3_color = pickColor(srcImageData, a3)
  const a4_color = pickColor(srcImageData, a4)

  const c1_color = twoColorLinear(a1_color, a2_color, xFactor)
  const c2_color = twoColorLinear(a3_color, a4_color, xFactor)
  const c3_color = twoColorLinear(c1_color, c2_color, yFactor)

  return c3_color
}

function sampleBicubic (srcImageData: ImageData, u: number, v: number) {
  /**
   * a01----a02----a03----a04      c1
   * |                      |      |
   * |                      |      |
   * a11----a12----a13----a14      c2
   * |       |  c   |       |      |
   * |       |      |       |      |
   * a21----a22----a23----a24      c3
   * |                      |      |
   * |                      |      |
   * a31----a32----a33----a34      c4
   */
  let { data: srcData, width: srcWidth, height: srcHeight } = srcImageData
  const x = srcWidth * u
  const y = srcHeight * v

  // 最靠近采样位置的四个点
  const a12 = Point(x | 0, y | 0)
  const a13 = Point(a12.x + 1, a12.y)
  const a22 = Point(a12.x, a12.y + 1)
  const a23 = Point(a12.x + 1, a12.y + 1)

  // 边上的其余点
  const a01 = Point(a12.x - 1, a12.y - 1)
  const a02 = Point(a12.x, a12.y - 1)
  const a03 = Point(a12.x + 1, a12.y - 1)
  const a04 = Point(a12.x + 2, a12.y - 1)
  const a11 = Point(a12.x - 1, a12.y)
  const a14 = Point(a12.x + 2, a12.y)
  const a21 = Point(a12.x - 1, a12.y + 1)
  const a24 = Point(a12.x + 2, a12.y + 1)
  const a31 = Point(a12.x - 1, a12.y + 2)
  const a32 = Point(a12.x, a12.y + 2)
  const a33 = Point(a12.x + 1, a12.y + 2)
  const a34 = Point(a12.x + 2, a12.y + 2)

  const xFactor = x - a12.x
  const yFactor = y - a12.y

  const c1 = fourColorLinear(
    pickColor(srcImageData, a01),
    pickColor(srcImageData, a02),
    pickColor(srcImageData, a03),
    pickColor(srcImageData, a04),
    xFactor
  )

  const c2 = fourColorLinear(
    pickColor(srcImageData, a11),
    pickColor(srcImageData, a12),
    pickColor(srcImageData, a13),
    pickColor(srcImageData, a14),
    xFactor
  )

  const c3 = fourColorLinear(
    pickColor(srcImageData, a21),
    pickColor(srcImageData, a22),
    pickColor(srcImageData, a23),
    pickColor(srcImageData, a24),
    xFactor
  )

  const c4 = fourColorLinear(
    pickColor(srcImageData, a31),
    pickColor(srcImageData, a32),
    pickColor(srcImageData, a33),
    pickColor(srcImageData, a34),
    xFactor
  )

  const c = fourColorLinear(c1, c2, c3, c4, yFactor)
  
  return c
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

function upscale_bicubic (srcImageData: ImageData, destImageData: ImageData) {
  let { data: destData, width: destWidth, height: destHeight } = destImageData

  for (let i = 0; i < destWidth * destHeight; i++) {
    const destX = i % destWidth
    const destY = i / destWidth

    const pixels = sampleBicubic(srcImageData, destX / destWidth, destY / destHeight)

    destData[i * 4] = pixels[0]
    destData[i * 4 + 1] = pixels[1]
    destData[i * 4 + 2] = pixels[2]
    destData[i * 4 + 3] = pixels[3]
  }
}

export {
  upscale_nearest,
  upscale_linear,
  upscale_bicubic
}
