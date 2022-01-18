<template>
  <h1>image upscale with GPU.js</h1>

  <div>
    <input type="number" v-model="upscalePower">
    <input ref="fileElement" type="file" @change="file = fileElement.files[0]">
  </div>

  <div class="imgdiv">
    <div class="cover-box" :style="boxStyle">

    </div>
    <img @wheel="onWheelImage" @mousemove="onMouseMoveImage" ref="imageElement" src="./assets/len_top.jpeg" alt="lena">
  </div>

  <div class="row">
    <div ref="nearestWindow" class="col">

    </div>
    <div ref="linearWindow" class="col">

    </div>
    <div ref="bicubicWindow" class="col">

    </div>
  </div>

  <div>
    <canvas v-show="false" ref="canvas1"></canvas>
    <canvas ref="canvas2"></canvas>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Box,
  upscale_nearest_kernelGenerate,
  upscale_linear_kernelGenerate,
  upscale_bicubic_kernelGenerate
} from './gpu-upscale'

/** DATA */

const fileElement = ref()
const imageElement = ref<HTMLImageElement>()
const canvas1 = ref<HTMLCanvasElement>()
const canvas2 = ref<HTMLCanvasElement>()
const nearestWindow = ref<HTMLDivElement>()
const linearWindow = ref<HTMLDivElement>()
const bicubicWindow = ref<HTMLDivElement>()

const file = ref<File>()
const upscalePower = ref(4)

const boxInfo = reactive<Box>({
  top: 0,
  left: 0,
  width: 0,
  height: 0
})

let nearestKernel: any = null
let linearKernel: any = null
let bicubicKernel: any = null

const boxStyle = computed(() => {
  return {
    top: `${boxInfo.top}px`,
    left: `${boxInfo.left}px`,
    width: `${boxInfo.width}px`,
    height: `${boxInfo.height}px`
  }
})

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

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

function onWheelImage (event: WheelEvent) {
  event.preventDefault()
  upscalePower.value = clamp(upscalePower.value + (event.deltaY / 64), 0, 64)
  onMouseMoveImage(event)
}

function onMouseMoveImage (event: MouseEvent) {
  const { offsetX, offsetY } = event
  
  if (imageElement.value && nearestKernel) {
    boxInfo.width = clamp(imageElement.value.width / upscalePower.value, 0, imageElement.value.width)
    boxInfo.height = clamp(imageElement.value.height / upscalePower.value, 0, imageElement.value.height)
    boxInfo.top = offsetY - boxInfo.height / 2
    boxInfo.left = offsetX - boxInfo.width / 2

    nearestKernel(imageElement.value, imageElement.value.height, boxInfo.width, boxInfo.height, boxInfo.top, boxInfo.left)
    linearKernel(imageElement.value, imageElement.value.height, boxInfo.width, boxInfo.height, boxInfo.top, boxInfo.left)
    bicubicKernel(imageElement.value, imageElement.value.height, boxInfo.width, boxInfo.height, boxInfo.top, boxInfo.left)
  }
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

onMounted(() => {
  if (imageElement.value && nearestWindow.value && linearWindow.value && bicubicWindow.value) {
    const imageEl = imageElement.value
    const nearestWindowEl = nearestWindow.value
    const linearWindowEl = linearWindow.value
    const bicubicWindowEl = bicubicWindow.value

    imageEl.onload = () => {
      renderCanvas1()

      nearestKernel = upscale_nearest_kernelGenerate(imageEl.width, imageEl.height)
      nearestWindowEl.appendChild(nearestKernel.canvas)

      linearKernel = upscale_linear_kernelGenerate(imageEl.width, imageEl.height)
      linearWindowEl.appendChild(linearKernel.canvas)

      bicubicKernel = upscale_bicubic_kernelGenerate(imageEl.width, imageEl.height)
      bicubicWindowEl.appendChild(bicubicKernel.canvas)
    }
  }
})
</script>

<style>
.row {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}
.imgdiv {
  position: relative;
}
.imgdiv .cover-box {
  position: absolute;
  background-color: rgb(192, 36, 36);
  opacity: 0.4;
  pointer-events: none;
}
.imgdiv img {
  max-width: 100%;
  height: auto;
}
</style>
