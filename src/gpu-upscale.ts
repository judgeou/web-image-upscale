import { GPU } from 'gpu.js'

const gpu = new GPU()

function twoNumberLinear (num1: number, num2: number, factor: number) {
  let a = num2 - num1
  return num1 + (a * factor)
}

function twoColorLinear (color1: number[], color2: number[], factor: number) {
  return [
    twoNumberLinear(color1[0], color2[0], factor),
    twoNumberLinear(color1[1], color2[1], factor),
    twoNumberLinear(color1[2], color2[2], factor),
    twoNumberLinear(color1[3], color2[3], factor)
  ]
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

gpu.addFunction(twoNumberLinear)
gpu.addFunction(twoColorLinear, {
  argumentTypes: { color1: 'Array(4)', color2: 'Array(4)', factor: 'Number' },
  returnType: 'Array(4)'
})
gpu.addFunction(fourNumberLinear)
gpu.addFunction(fourColorLinear, {
  argumentTypes: { color1: 'Array(4)', color2: 'Array(4)', color3: 'Array(4)', color4: 'Array(4)', factor: 'Number' },
  returnType: 'Array(4)'
})

function upscale_nearest (image: HTMLImageElement, power: number) {
  const outputImageWidth = Math.round(image.width * power)
  const outputImageHeight = Math.round(image.height * power)
  
  const kernel = gpu.createKernel(function (image: any, srcWidth: number, srcHeight: number) {
    const { x, y } = this.thread
    const { x: width, y: height } = this.output
    
    const srcX = Math.round(srcWidth * (x / width))
    const srcY = Math.round(srcHeight * (y / height))
    const pixel = image[srcY][srcX]

    this.color(pixel[0], pixel[1], pixel[2], pixel[3])
  }, {
    graphical: true,
    output: [ outputImageWidth, outputImageHeight ]
  })

  kernel(image, image.width, image.height)

  return kernel
}

function upscale_linear (image: HTMLImageElement, power: number) {
  const outputImageWidth = Math.round(image.width * power)
  const outputImageHeight = Math.round(image.height * power)
  
  const kernel = gpu.createKernel(function (image: any, srcWidth: number, srcHeight: number) {    
    const { x, y } = this.thread
    const { x: width, y: height } = this.output
    const u = x / width
    const v = y / height
    const x_float = srcWidth * u
    const y_float = srcHeight * v

    const a1 = [ Math.floor(x_float), Math.floor(y_float) ]
    const a2 = [ a1[0] + 1, a1[1] ]
    const a3 = [ a1[0], a1[1] + 1 ]
    const a4 = [ a1[0] + 1, a1[1] + 1 ]

    const a1_pixel = image[a1[1]][a1[0]]
    const a2_pixel = image[a2[1]][a2[0]]
    const a3_pixel = image[a3[1]][a3[0]]
    const a4_pixel = image[a4[1]][a4[0]]

    const xFactor = x_float - a1[0]
    const yFactor = y_float - a1[1]
    
    const c1_pixel = twoColorLinear(a1_pixel, a2_pixel, xFactor)
    const c2_pixel = twoColorLinear(a3_pixel, a4_pixel, xFactor)
    const c3_pixel = twoColorLinear(c1_pixel, c2_pixel, yFactor)

    this.color(c3_pixel[0], c3_pixel[1], c3_pixel[2], c3_pixel[3])
  }, {
    graphical: true,
    output: [ outputImageWidth, outputImageHeight ]
  })

  kernel(image, image.width, image.height)

  return kernel
}

function upscale_bicubic (image: HTMLImageElement, power: number) {
  const outputImageWidth = Math.round(image.width * power)
  const outputImageHeight = Math.round(image.height * power)
  
  const kernel = gpu.createKernel(function (image: any, srcWidth: number, srcHeight: number) {    
    const { x, y } = this.thread
    const { x: width, y: height } = this.output
    const u = x / width
    const v = y / height
    const x_float = srcWidth * u
    const y_float = srcHeight * v

    const a12 = [ Math.floor(x_float), Math.floor(y_float) ]
    const a13 = [ a12[0] + 1, a12[1] ]
    const a22 = [ a12[0],     a12[1] + 1 ]
    const a23 = [ a12[0] + 1, a12[1] + 1]
    
    const a01 = [ a12[0] - 1, a12[1] - 1 ]
    const a02 = [ a12[0], a12[1] - 1 ]
    const a03 = [ a12[0] + 1, a12[1] - 1 ]
    const a04 = [ a12[0] + 2, a12[1] - 1 ]
    const a11 = [ a12[0] - 1, a12[1] ]
    const a14 = [ a12[0] + 2, a12[1] ]
    const a21 = [ a12[0] - 1, a12[1] + 1 ]
    const a24 = [ a12[0] + 2, a12[1] + 1 ]
    const a31 = [ a12[0] - 1, a12[1] + 2 ]
    const a32 = [ a12[0], a12[1] + 2 ]
    const a33 = [ a12[0] + 1, a12[1] + 2 ]
    const a34 = [ a12[0] + 2, a12[1] + 2 ]

    const xFactor = x_float - a12[0]
    const yFactor = y_float - a12[1]

    const c1 = fourColorLinear(
      image[a01[1]][a01[0]],
      image[a02[1]][a02[0]],
      image[a03[1]][a03[0]],
      image[a04[1]][a04[0]],
      xFactor
    )

    const c2 = fourColorLinear(
      image[a11[1]][a11[0]],
      image[a12[1]][a12[0]],
      image[a13[1]][a13[0]],
      image[a14[1]][a14[0]],
      xFactor
    )

    const c3 = fourColorLinear(
      image[a21[1]][a21[0]],
      image[a22[1]][a22[0]],
      image[a23[1]][a23[0]],
      image[a24[1]][a24[0]],
      xFactor
    )

    const c4 = fourColorLinear(
      image[a31[1]][a31[0]],
      image[a32[1]][a32[0]],
      image[a33[1]][a33[0]],
      image[a34[1]][a34[0]],
      xFactor
    )

    const c = fourColorLinear(c1, c2, c3, c4, yFactor)
  
    this.color(c[0], c[1], c[2], c[3])
  }, {
    graphical: true,
    output: [ outputImageWidth, outputImageHeight ]
  })

  kernel(image, image.width, image.height)

  return kernel
}

export {
  upscale_nearest,
  upscale_linear,
  upscale_bicubic
}
