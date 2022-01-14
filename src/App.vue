<template>
  <h1>图像放大研究</h1>
  <div>
    <input v-show="false" ref="fileElement" type="file" @change="file = fileElement.files[0]">
    <img ref="imageElement" src="./assets/len_top.jpeg" alt="lena">
  </div>
  <div>
    <input type="number" v-model="upscalePower">
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

/** DATA */
const fileElement = ref()
const imageElement = ref<HTMLImageElement>()
const canvas1 = ref<HTMLCanvasElement>()
const canvas2 = ref<HTMLCanvasElement>()
const file = ref<File>()
const upscalePower = ref(2)
const costTime = ref(0)

/** WATCH */
watch(file, () => {
  const img = new Image()
  if (file.value) {
    const src = img.src = URL.createObjectURL(file.value)
    img.onload = function () {
      renderCanvas1()
    }
  }
})

function doUpscale () {
  renderCanvas2(upscalePower.value)
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
    let startTime = new Date()

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

    let overTime = new Date()

    costTime.value = overTime.getTime() - startTime.getTime()
  }
}

function upscale (srcImageData: ImageData, destImageData: ImageData) {
  let { data: srcData, width: srcWidth, height: srcHeight } = srcImageData
  let { data: destData, width: destWidth, height: destHeight } = destImageData

  for (let i = 0; i < destWidth * destHeight; i++) {
    const destX = (i % destWidth)
    const destY = Math.floor(i / destWidth)
    const srcX = Math.round(srcWidth * (destX / destWidth))
    const srcY = Math.round(srcHeight * (destY / destHeight))
    
    const srcIndex = srcX * 4 + (srcY * 4 * srcWidth)
    const destIndex = i * 4;

    destData[destIndex] = srcData[srcIndex]
    destData[destIndex + 1] = srcData[srcIndex + 1]
    destData[destIndex + 2] = srcData[srcIndex + 2]
    destData[destIndex + 3] = srcData[srcIndex + 3]
  }
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
