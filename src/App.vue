<template>
  <h1>image upscale 图像放大算法</h1>
  <div>
    <input ref="fileElement" type="file" @change="file = fileElement.files[0]">
    <br />
    <img ref="imageElement" src="./assets/lozman.png" alt="lena">
  </div>
  <div>
    <input type="number" v-model="upscalePower">
    
    <select v-model="scaleMethodIndex">
      <option v-for="(item, index) in scaleMethods" :value="index">{{ item.name }}</option>
    </select>

    <input type="checkbox" v-model="isEnableGPU"> GPU 加速

    <button @click="doUpscale">放大图像</button>
    <span v-if="costTime > 0">{{ costTime / 1000 }}s</span>
  </div>
  <div v-if="canvas2">
    {{ canvas2.width }} x {{ canvas2.height}} = {{ canvas2.width * canvas2.height }} px
  </div>
  <div>
    <canvas v-show="false" ref="canvas1"></canvas>
    <canvas ref="canvas2"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { upscale_nearest, upscale_linear, upscale_bicubic } from './cpu-upscale'
import {
  upscale_nearest as upscale_nearest_gpu,
  upscale_linear as upscale_linear_gpu,
  upscale_bicubic as upscale_bicubic_gpu
} from './gpu-upscale'

/** DATA */
const scaleMethods = [
  {
    name: '临近法插值',
    func: upscale_nearest,
    gpuFunc: upscale_nearest_gpu
  },
  {
    name: '双线性插值',
    func: upscale_linear,
    gpuFunc: upscale_linear_gpu
  },
  {
    name: '双三次插值',
    func: upscale_bicubic,
    gpuFunc: upscale_bicubic_gpu
  }
]

const fileElement = ref()
const imageElement = ref<HTMLImageElement>()
const canvas1 = ref<HTMLCanvasElement>()
const canvas2 = ref<HTMLCanvasElement>()
const file = ref<File>()
const upscalePower = ref(32)
const scaleMethodIndex = ref(0)
const isEnableGPU = ref(true)
const costTime = ref(0)

/** WATCH */
watch(file, () => {
  const img = imageElement.value
  if (file.value && img) {
    img.src = URL.createObjectURL(file.value)
    img.onload = function () {
      renderCanvas1()
    }
  }
})

function doUpscale () {
  let startTime = new Date()
  
  if (isEnableGPU.value && imageElement.value && canvas2.value) {
    const kernel = scaleMethods[scaleMethodIndex.value].gpuFunc(imageElement.value, upscalePower.value)
    const ctx = canvas2.value.getContext('2d')

    if (ctx && kernel) {
      const newCanvas = kernel.canvas
      canvas2.value.width = imageElement.value.width * upscalePower.value
      canvas2.value.height = imageElement.value.height * upscalePower.value
      ctx.drawImage(newCanvas, 0, 0)
      kernel.destroy(true)
    }
  } else {
    renderCanvas2(upscalePower.value)
  }

  let overTime = new Date()
  costTime.value = overTime.getTime() - startTime.getTime()
}

function renderCanvas1 () {
  const img = imageElement.value
  if (canvas1.value && img) {
    const { width, height } = img
    canvas1.value.width = width
    canvas1.value.height = height

    const ctx1 = canvas1.value.getContext('2d')
    ctx1?.drawImage(img, 0, 0, img.width, img.height)
  }
}

/** METHODS */
function renderCanvas2 (power: number) {
  if (imageElement.value && canvas2.value) {
    let originalWidth = imageElement.value.width
    let originalHeight = imageElement.value.height
    let width = originalWidth * power
    let height = originalHeight * power

    canvas2.value.width = width
    canvas2.value.height = height

    const ctx = canvas2.value?.getContext('2d')
    const imgData = ctx?.createImageData(width, height)
    
    if (imgData && canvas1.value) {
      const ctx1 = canvas1.value.getContext('2d')
      const srcImgData = ctx1?.getImageData(0, 0, originalWidth, originalHeight)

      if (srcImgData) {
        upscale(srcImgData, imgData)
        ctx?.putImageData(imgData, 0, 0)
      }
    }
  }
}

function upscale (srcImageData: ImageData, destImageData: ImageData) {
  scaleMethods[scaleMethodIndex.value].func(srcImageData, destImageData)
}

onMounted(() => {
  if (imageElement.value) {
    imageElement.value.onload = () => {
      renderCanvas1()
    }
  }
})
</script>

<style>

</style>
