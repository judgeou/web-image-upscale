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

gpu.addFunction(twoNumberLinear)
gpu.addFunction(twoColorLinear, {
  argumentTypes: { color1: 'Array(4)', color2: 'Array(4)', factor: 'Number' },
  returnType: 'Array(4)'
})

function upscale_nearest (image: HTMLImageElement, power: number) {
  const outputImageWidth = image.width * power
  const outputImageHeight = image.height * power
  
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
  const outputImageWidth = image.width * power
  const outputImageHeight = image.height * power
  
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

export {
  upscale_nearest,
  upscale_linear
}
