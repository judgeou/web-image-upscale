<template>
  <h1>image upscale with GPU.js</h1>
  <div>Don't select a big image, GPU.js has some bug</div>
  <div>
    <input ref="fileElement" type="file" @change="file = fileElement.files[0]">
    <img ref="imageElement" v-if="imgUrl" v-show="false" :src="imgUrl">
  </div>

  <div class="imgdiv">
    <div class="cover-box" :style="boxStyle">

    </div>
    <img @wheel="onWheelImage" @mousemove="onMouseMoveImage" ref="imageElementMini" :src="imgUrl">
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
import lena from './assets/len_top.jpeg'

/** DATA */

const fileElement = ref()
const imageElement = ref<HTMLImageElement>()
const imageElementMini = ref<HTMLImageElement>()
const canvas1 = ref<HTMLCanvasElement>()
const canvas2 = ref<HTMLCanvasElement>()
const nearestWindow = ref<HTMLDivElement>()
const linearWindow = ref<HTMLDivElement>()
const bicubicWindow = ref<HTMLDivElement>()

const file = ref<File>()
const imgUrl = ref<string>(lena)
const upscalePower = ref(4)

const boxInfo = reactive<Box>({
  top: 0,
  left: 0,
  width: 0,
  height: 0
})

let nearestKernel: ReturnType<typeof upscale_nearest_kernelGenerate>
let linearKernel: ReturnType<typeof upscale_linear_kernelGenerate>
let bicubicKernel: ReturnType<typeof upscale_bicubic_kernelGenerate>

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
  if (file.value) {
    imgUrl.value = URL.createObjectURL(file.value)
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
  
  if (imageElement.value && imageElementMini.value && nearestKernel) {
    boxInfo.width = clamp(imageElementMini.value.width / upscalePower.value, 0, imageElementMini.value.width)
    boxInfo.height = clamp(imageElementMini.value.height / upscalePower.value, 0, imageElementMini.value.height)
    boxInfo.top = clamp(offsetY - boxInfo.height / 2, 0, imageElementMini.value.height - boxInfo.height)
    boxInfo.left = clamp(offsetX - boxInfo.width / 2, 0, imageElementMini.value.width - boxInfo.width)

    // 
    const bigbox: Box = {
      width: boxInfo.width * (imageElement.value.width / imageElementMini.value.width),
      height: boxInfo.height * (imageElement.value.height / imageElementMini.value.height),
      top: boxInfo.top * (imageElement.value.height / imageElementMini.value.height),
      left: boxInfo.left * (imageElement.value.width / imageElementMini.value.width)
    }

    nearestKernel.drawCall(bigbox)
    linearKernel.drawCall(bigbox)
    bicubicKernel.drawCall(bigbox)
  }
}

function generateKernel () {
  if (imageElement.value && nearestWindow.value && linearWindow.value && bicubicWindow.value) {
    const imageEl = imageElement.value
    const nearestWindowEl = nearestWindow.value
    const linearWindowEl = linearWindow.value
    const bicubicWindowEl = bicubicWindow.value

    if (nearestKernel) {
      nearestKernel.destroy()
    }
    if (linearKernel) {
      linearKernel.destroy()
    }
    if (bicubicKernel) {
      bicubicKernel.destroy()
    }

    const outputSize = {
      width: Math.round(document.body.clientWidth / 3 - 10),
      height: Math.round((document.body.clientWidth / 3 - 10) / (imageEl.width / imageEl.height))
    }

    nearestKernel = upscale_nearest_kernelGenerate(imageEl, outputSize.width, outputSize.height)
    nearestWindowEl.appendChild(nearestKernel.canvas)

    linearKernel = upscale_linear_kernelGenerate(imageEl, outputSize.width, outputSize.height)
    linearWindowEl.appendChild(linearKernel.canvas)

    bicubicKernel = upscale_bicubic_kernelGenerate(imageEl, outputSize.width, outputSize.height)
    bicubicWindowEl.appendChild(bicubicKernel.canvas)
  }
}

onMounted(() => {
  if (imageElement.value) {
    const imageEl = imageElement.value

    imageEl.onload = generateKernel
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
  width: auto;
  height: 35vh;
}
</style>
