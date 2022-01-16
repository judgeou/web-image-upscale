import { GPU } from 'gpu.js'

const gpu = new GPU()

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

const test1 = gpu.createKernel(function (image) {
  this.color(1, 0, 0, 1)
}, {
  output: [ 20, 20 ],
  graphical: true
})

export {
  upscale_nearest
}
