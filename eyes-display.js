const CLASSIC_EYES = {
    id: "classic",
    leftX: 72,
    rightX: 216,
    y: 56,
    halfW: 49,
    irisX: 12,
    irisY: 13.6,
    pupilX: 3.7,
    pupilY: 16.7,
    upper: 18.5,
    upper2: 16.5,
    lower: 7.5,
    lower2: 15.5,
    lidC1: 29,
    lidC2: 18,
    lidC3: 25,
    lidC4: 24,
    socketX: 1.8,
    socketY: 1.15,
    lookX: 12.5,
    lookY: 6.2,
}

const EYE_VARIANTS = [
    CLASSIC_EYES,
    { ...CLASSIC_EYES, id: "sleepy", upper: 11, upper2: 9, pupilY: 11, irisY: 10, y: 58 },
    { ...CLASSIC_EYES, id: "wide", halfW: 58, irisX: 14.5, irisY: 15.5, lidC1: 34, lidC2: 22 },
    { ...CLASSIC_EYES, id: "squint", upper: 12, upper2: 10, halfW: 45, pupilY: 8, irisY: 8.5 },
    { ...CLASSIC_EYES, id: "glare", upper: 13, upper2: 12, pupilX: 2.8, pupilY: 21, irisX: 10, lookY: 8 },
    { ...CLASSIC_EYES, id: "close", leftX: 92, rightX: 196 },
    { ...CLASSIC_EYES, id: "far", leftX: 58, rightX: 230 },
]

function pickEyeVariant() {
    if (Math.random() < 0.4) return CLASSIC_EYES
    return EYE_VARIANTS[Math.floor(Math.random() * EYE_VARIANTS.length)]
}

class EyesDisplay {
    constructor(element, variant = CLASSIC_EYES) {
        this.element = element
        this.variant = variant && variant.id ? variant : CLASSIC_EYES
        this.sourceWidth = 288
        this.sourceHeight = 112
        this.columns = 64
        this.rows = 28
        this.artRows = 28
        this.frameColumns = 9
        this.frameRows = 7
        this.cacheVersion = "eyes-v21"
        this.densityChars = ["\u00b7", "~", "o", "x", "+", "=", "*", "%", "$", "@"]
        this.frameCache = new Map()
        this.blinkFrame = { bright: "", dim: "" }
        this.canvas = document.createElement("canvas")
        this.canvas.width = this.columns
        this.canvas.height = this.artRows
        this.context = this.canvas.getContext("2d", { willReadFrequently: true })
        this.pointer = { x: 0, y: 0, active: false }
        this.idleStart = performance.now()
        this.lastRenderedFrame = ""
        this.isBlinking = false
        this.blinkEndsAt = 0
        this.rngState = 0x9e3779b9
        this.nextBlinkAt = performance.now() + this.randomRange(4500, 9000)
        this.resizeObserver = null
        this.isBuildingFrames = false
        this.pendingRebuild = false
        this.backgroundLayer = null
        this.layers = []
        this.activeLayerIndex = 0
        this.hoveredEye = ""
        this.scrollUntil = 0
        this.scrollY = Math.floor(this.frameRows / 2)
        this.avertUntil = 0
        this.avertX = Math.floor(this.frameColumns / 2)
        this.currentGaze = {
            x: Math.floor(this.frameColumns / 2),
            y: Math.floor(this.frameRows / 2),
        }
        this.lastMotionTimestamp = 0
        this.lastAnimationFrame = 0
        this.activeFrameInterval = 1000 / 60
        this.idleFrameInterval = 1000 / 24
        this.wasTracking = false
        this.pendingIdleBlink = true

        this.handlePointerMove = this.handlePointerMove.bind(this)
        this.handlePointerLeave = this.handlePointerLeave.bind(this)
        this.handleWheel = this.handleWheel.bind(this)
        this.handleClick = this.handleClick.bind(this)
        this.handleContextMenu = this.handleContextMenu.bind(this)
        this.animate = this.animate.bind(this)
        this.handleResize = this.handleResize.bind(this)

        this.initialize()
    }

    async initialize() {
        this.setupLayers()
        this.updateGridSize()
        this.renderBackground()
        const hasCachedFrames = this.loadFramesFromCache()
        if (!hasCachedFrames) {
            try {
                await this.buildFrames()
            } catch {
                this.variant = CLASSIC_EYES
                if (!this.loadFramesFromCache()) {
                    await this.buildFrames()
                }
            }
        }
        this.observeResize()
        window.addEventListener("mousemove", this.handlePointerMove)
        window.addEventListener("mouseleave", this.handlePointerLeave)
        window.addEventListener("wheel", this.handleWheel, { passive: false })
        window.addEventListener("contextmenu", this.handleContextMenu)
        this.element.addEventListener("click", this.handleClick)
        this.renderFrame(this.getCenterFrameKey(), true)
        requestAnimationFrame(this.animate)
    }

    clearCache() {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
            const key = localStorage.key(index)

            if (key && key.startsWith("eyes-v")) {
                localStorage.removeItem(key)
            }
        }

        this.frameCache.clear()
        this.blinkFrame = { bright: "", dim: "" }
        this.lastRenderedFrame = ""
    }

    setupLayers() {
        this.element.replaceChildren()
        this.backgroundLayer = document.createElement("pre")
        this.backgroundLayer.className = "eyes__bg"
        this.element.appendChild(this.backgroundLayer)
        this.layers = [0, 1].map((index) => {
            const layer = document.createElement("div")
            layer.className = `eyes__layer${index === 0 ? " eyes__layer--active" : ""}`
            const dimTone = this.createRegionPair("eyes__tone eyes__tone--dim")
            const brightTone = this.createRegionPair("eyes__tone eyes__tone--bright")
            layer.append(dimTone.left, dimTone.right, brightTone.left, brightTone.right)
            this.element.appendChild(layer)
            return {
                shell: layer,
                dim: dimTone,
                bright: brightTone,
            }
        })
    }

    createRegionPair(baseClassName) {
        const createRegion = (side) => {
            const region = document.createElement("pre")
            region.className = `${baseClassName} eyes__region eyes__region--${side}`
            return region
        }

        return {
            left: createRegion("left"),
            right: createRegion("right"),
        }
    }

    observeResize() {
        if (typeof ResizeObserver === "undefined") {
            return
        }

        this.resizeObserver = new ResizeObserver(this.handleResize)
        this.resizeObserver.observe(this.element)
    }

    async handleResize() {
        const previousColumns = this.columns
        const previousRows = this.rows
        const previousArtRows = this.artRows

        this.updateGridSize()

        if (
            previousColumns === this.columns &&
            previousRows === this.rows &&
            previousArtRows === this.artRows
        ) {
            return
        }

        this.renderBackground()
        const hasCachedFrames = this.loadFramesFromCache()

        if (!hasCachedFrames) {
            await this.buildFrames()
        }
        this.currentGaze = {
            x: Math.floor(this.frameColumns / 2),
            y: Math.floor(this.frameRows / 2),
        }
        this.renderFrame(this.getCenterFrameKey(), true)

    }

    measureCharacter() {
        const probe = document.createElement("span")
        probe.textContent = "M"
        probe.style.position = "absolute"
        probe.style.visibility = "hidden"
        probe.style.whiteSpace = "pre"
        probe.style.left = "0"
        probe.style.top = "0"
        probe.style.font = getComputedStyle(this.element).font
        this.element.appendChild(probe)
        const rect = probe.getBoundingClientRect()
        probe.remove()

        return {
            width: rect.width || 1,
            height: rect.height || 1,
        }
    }

    updateGridSize() {
        this.columns = 88
        this.rows = 22
        this.artRows = 22
        this.canvas.width = this.columns
        this.canvas.height = this.artRows
    }

    async buildFrames() {
        if (this.isBuildingFrames) {
            this.pendingRebuild = true
            return
        }

        this.isBuildingFrames = true
        this.frameCache.clear()
        const framePromises = []

        for (let y = 0; y < this.frameRows; y += 1) {
            for (let x = 0; x < this.frameColumns; x += 1) {
                framePromises.push(this.createFrame(x, y, false))
            }
        }

        const frames = await Promise.all(framePromises)

        for (const frame of frames) {
            this.frameCache.set(`${frame.x}:${frame.y}`, frame.tones)
        }

        this.blinkFrame = (await this.createFrame(
            Math.floor(this.frameColumns / 2),
            Math.floor(this.frameRows / 2),
            true
        )).tones
        this.saveFramesToCache()
        this.isBuildingFrames = false

        if (this.pendingRebuild) {
            this.pendingRebuild = false
            await this.buildFrames()
        }
    }

    async createFrame(frameX, frameY, blink) {
        const svg = this.createSvg(frameX, frameY, blink)
        const tones = await this.rasterizeSvg(svg)

        return { x: frameX, y: frameY, tones }
    }

    createSvg(frameX, frameY, blink) {
        const v = this.variant
        const centerColumn = Math.floor(this.frameColumns / 2)
        const centerRow = Math.floor(this.frameRows / 2)
        const normalizedX = (frameX - centerColumn) / Math.max(1, centerColumn)
        const normalizedY = (frameY - centerRow) / Math.max(1, centerRow)
        const socketOffsetX = normalizedX * v.socketX
        const socketOffsetY = normalizedY * v.socketY
        const pupilOffsetX = normalizedX * v.lookX
        const pupilOffsetY = normalizedY * v.lookY
        const leftCenterX = v.leftX + socketOffsetX
        const rightCenterX = v.rightX + socketOffsetX
        const centerY = v.y + socketOffsetY
        const eyeHalfWidth = v.halfW
        const irisRadiusX = v.irisX
        const irisRadiusY = v.irisY
        const pupilRadiusX = v.pupilX
        const pupilRadiusY = v.pupilY
        const pupilShadowRadiusX = pupilRadiusX + 2.1
        const pupilShadowRadiusY = pupilRadiusY + 1.1
        const upperEase = normalizedY * -0.85
        const lowerEase = Math.max(0, normalizedY) * 0.5
        const eyeShape = (cx) =>
            `M ${cx - eyeHalfWidth} ${centerY + 4}
             C ${cx - v.lidC1} ${centerY - v.upper - upperEase} ${cx + v.lidC2} ${centerY - v.upper2 - upperEase} ${cx + eyeHalfWidth} ${centerY}
             C ${cx + v.lidC3} ${centerY + v.lower - lowerEase} ${cx - v.lidC4} ${centerY + v.lower2 - lowerEase} ${cx - eyeHalfWidth} ${centerY + 4} Z`
        const leftStart = leftCenterX - eyeHalfWidth
        const leftEnd = leftCenterX + eyeHalfWidth
        const rightStart = rightCenterX - eyeHalfWidth
        const rightEnd = rightCenterX + eyeHalfWidth
        const bagDrop = 12.2 + Math.max(0, normalizedY) * 0.9
        const bagSoftDrop = 22.9 + Math.max(0, normalizedY) * 1.6
        const troughDrop = bagDrop + 4.7
        const troughSoftDrop = bagSoftDrop + 3.1
        const innerTroughLift = 2.8 + Math.max(0, -normalizedY) * 0.7
        const tearTroughSoftDrop = troughSoftDrop + 2.8
        const creaseLift = 19 + Math.max(0, -normalizedY) * 1.2
        const shadowLift = 7.5 + Math.max(0, -normalizedY) * 0.8

        const blinkMarkup = `
          <path d="M ${leftStart} ${centerY + 2} Q ${leftCenterX - 2} ${centerY - 4} ${leftEnd} ${centerY}" fill="none" stroke="#ece6d8" stroke-width="6.8" stroke-linecap="round"/>
          <path d="M ${rightStart} ${centerY} Q ${rightCenterX + 2} ${centerY - 4} ${rightEnd} ${centerY + 2}" fill="none" stroke="#ece6d8" stroke-width="6.8" stroke-linecap="round"/>
          <path d="M ${leftStart + 3} ${centerY - shadowLift} Q ${leftCenterX - 8} ${centerY - creaseLift} ${leftEnd - 4} ${centerY - shadowLift - 1}" fill="none" stroke="#59554f" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M ${rightStart + 4} ${centerY - shadowLift - 1} Q ${rightCenterX + 8} ${centerY - creaseLift} ${rightEnd - 3} ${centerY - shadowLift}" fill="none" stroke="#59554f" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M ${leftStart + 8} ${centerY + bagDrop - 1} C ${leftCenterX - 20} ${centerY + bagSoftDrop - 3} ${leftCenterX + 1} ${centerY + bagSoftDrop + 1.3} ${leftEnd - 15} ${centerY + bagDrop - 5}" fill="none" stroke="#403b36" stroke-width="3.05" stroke-linecap="round"/>
          <path d="M ${leftCenterX - 19} ${centerY + troughDrop - innerTroughLift} Q ${leftCenterX - 2} ${centerY + troughSoftDrop} ${leftCenterX + 15} ${centerY + troughDrop - 1.4}" fill="none" stroke="#151210" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M ${leftCenterX + 1} ${centerY + troughDrop - 0.5} Q ${leftCenterX + 9} ${centerY + tearTroughSoftDrop} ${leftCenterX + 18} ${centerY + troughDrop + 1.4}" fill="none" stroke="#0d0b0a" stroke-width="1.55" stroke-linecap="round"/>
          <path d="M ${rightStart + 15} ${centerY + bagDrop - 5} C ${rightCenterX - 1} ${centerY + bagSoftDrop + 1.3} ${rightCenterX + 20} ${centerY + bagSoftDrop - 3} ${rightEnd - 8} ${centerY + bagDrop - 1}" fill="none" stroke="#403b36" stroke-width="3.05" stroke-linecap="round"/>
          <path d="M ${rightCenterX - 15} ${centerY + troughDrop - 1.4} Q ${rightCenterX + 2} ${centerY + troughSoftDrop} ${rightCenterX + 19} ${centerY + troughDrop - innerTroughLift}" fill="none" stroke="#151210" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M ${rightCenterX - 1} ${centerY + troughDrop - 0.5} Q ${rightCenterX - 9} ${centerY + tearTroughSoftDrop} ${rightCenterX - 18} ${centerY + troughDrop + 1.4}" fill="none" stroke="#0d0b0a" stroke-width="1.55" stroke-linecap="round"/>
        `

        const openMarkup = `
          <defs>
            <clipPath id="left-eye-${v.id}">
              <path d="${eyeShape(leftCenterX)}" />
            </clipPath>
            <clipPath id="right-eye-${v.id}">
              <path d="${eyeShape(rightCenterX)}" />
            </clipPath>
          </defs>
          <path d="M ${leftStart + 3} ${centerY - shadowLift} Q ${leftCenterX - 8} ${centerY - creaseLift} ${leftEnd - 4} ${centerY - shadowLift - 1}" fill="none" stroke="#6b645d" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M ${leftStart + 8} ${centerY + bagDrop - 1} C ${leftCenterX - 20} ${centerY + bagSoftDrop - 3} ${leftCenterX + 1} ${centerY + bagSoftDrop + 1.3} ${leftEnd - 15} ${centerY + bagDrop - 5}" fill="none" stroke="#554f49" stroke-width="3.15" stroke-linecap="round"/>
          <path d="M ${leftCenterX - 19} ${centerY + troughDrop - innerTroughLift} Q ${leftCenterX - 2} ${centerY + troughSoftDrop} ${leftCenterX + 15} ${centerY + troughDrop - 1.4}" fill="none" stroke="#181513" stroke-width="2.25" stroke-linecap="round"/>
          <path d="M ${leftCenterX + 1} ${centerY + troughDrop - 0.5} Q ${leftCenterX + 9} ${centerY + tearTroughSoftDrop} ${leftCenterX + 18} ${centerY + troughDrop + 1.4}" fill="none" stroke="#0e0c0b" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M ${rightStart + 4} ${centerY - shadowLift - 1} Q ${rightCenterX + 8} ${centerY - creaseLift} ${rightEnd - 3} ${centerY - shadowLift}" fill="none" stroke="#6b645d" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M ${rightStart + 15} ${centerY + bagDrop - 5} C ${rightCenterX - 1} ${centerY + bagSoftDrop + 1.3} ${rightCenterX + 20} ${centerY + bagSoftDrop - 3} ${rightEnd - 8} ${centerY + bagDrop - 1}" fill="none" stroke="#554f49" stroke-width="3.15" stroke-linecap="round"/>
          <path d="M ${rightCenterX - 15} ${centerY + troughDrop - 1.4} Q ${rightCenterX + 2} ${centerY + troughSoftDrop} ${rightCenterX + 19} ${centerY + troughDrop - innerTroughLift}" fill="none" stroke="#181513" stroke-width="2.25" stroke-linecap="round"/>
          <path d="M ${rightCenterX - 1} ${centerY + troughDrop - 0.5} Q ${rightCenterX - 9} ${centerY + tearTroughSoftDrop} ${rightCenterX - 18} ${centerY + troughDrop + 1.4}" fill="none" stroke="#0e0c0b" stroke-width="1.6" stroke-linecap="round"/>
          <path d="${eyeShape(leftCenterX)}" fill="#f0ebdf"/>
          <path d="${eyeShape(rightCenterX)}" fill="#f0ebdf"/>
          <g clip-path="url(#left-eye-${v.id})">
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${irisRadiusX}" ry="${irisRadiusY}" fill="#726b63"/>
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilShadowRadiusX}" ry="${pupilShadowRadiusY}" fill="#0d0c0b" opacity="0.78"/>
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilRadiusX}" ry="${pupilRadiusY}" fill="#000000"/>
            <circle cx="${leftCenterX + pupilOffsetX - 4}" cy="${centerY + pupilOffsetY - 5.3}" r="1.25" fill="#f4f1e8"/>
            <path d="M ${leftStart + 3} ${centerY + 4} Q ${leftCenterX - 1} ${centerY - 6.8} ${leftEnd - 3} ${centerY + 1}" fill="none" stroke="#9c9488" stroke-width="6.1" stroke-linecap="round" opacity="0.36"/>
          </g>
          <g clip-path="url(#right-eye-${v.id})">
            <ellipse cx="${rightCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${irisRadiusX}" ry="${irisRadiusY}" fill="#726b63"/>
            <ellipse cx="${rightCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilShadowRadiusX}" ry="${pupilShadowRadiusY}" fill="#0d0c0b" opacity="0.78"/>
            <ellipse cx="${rightCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilRadiusX}" ry="${pupilRadiusY}" fill="#000000"/>
            <circle cx="${rightCenterX + pupilOffsetX - 4}" cy="${centerY + pupilOffsetY - 5.3}" r="1.25" fill="#f4f1e8"/>
            <path d="M ${rightStart + 3} ${centerY + 1} Q ${rightCenterX + 1} ${centerY - 6.8} ${rightEnd - 3} ${centerY + 4}" fill="none" stroke="#9c9488" stroke-width="6.1" stroke-linecap="round" opacity="0.36"/>
          </g>
          <path d="M ${leftStart} ${centerY + 4} C ${leftCenterX - 27} ${centerY - 20.5 - upperEase} ${leftCenterX + 18} ${centerY - 18 - upperEase} ${leftEnd} ${centerY}" fill="none" stroke="#fbf8f0" stroke-width="2.3" stroke-linecap="round"/>
          <path d="M ${leftStart} ${centerY + 4} C ${leftCenterX + 24} ${centerY + 7.5 - lowerEase} ${leftCenterX - 24} ${centerY + 15.2 - lowerEase} ${leftEnd} ${centerY}" fill="none" stroke="#e5dfd2" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M ${rightStart} ${centerY} C ${rightCenterX - 18} ${centerY - 18 - upperEase} ${rightCenterX + 27} ${centerY - 20.5 - upperEase} ${rightEnd} ${centerY + 4}" fill="none" stroke="#fbf8f0" stroke-width="2.3" stroke-linecap="round"/>
          <path d="M ${rightStart} ${centerY} C ${rightCenterX + 24} ${centerY + 15.2 - lowerEase} ${rightCenterX - 24} ${centerY + 7.5 - lowerEase} ${rightEnd} ${centerY + 4}" fill="none" stroke="#e5dfd2" stroke-width="1.9" stroke-linecap="round"/>
        `

        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.sourceWidth} ${this.sourceHeight}" width="${this.sourceWidth}" height="${this.sourceHeight}">
            ${blink ? blinkMarkup : openMarkup}
          </svg>
        `
    }

    async rasterizeSvg(svgMarkup) {
        const image = new Image()
        const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`

        await new Promise((resolve, reject) => {
            image.onload = resolve
            image.onerror = reject
            image.src = source
        })

        this.context.clearRect(0, 0, this.columns, this.artRows)
        this.context.drawImage(image, 0, 0, this.columns, this.artRows)

        const { data } = this.context.getImageData(0, 0, this.columns, this.artRows)
        const brightLines = []
        const dimLines = []

        for (let row = 0; row < this.artRows; row += 1) {
            const brightCells = []
            const dimCells = []

            for (let column = 0; column < this.columns; column += 1) {
                const index = (row * this.columns + column) * 4
                const alpha = data[index + 3] / 255

                if (alpha < 0.05) {
                    brightCells.push(" ")
                    dimCells.push(" ")
                    continue
                }

                const luminance =
                    ((data[index] + data[index + 1] + data[index + 2]) / (255 * 3)) * alpha

                if (luminance >= 0.45) {
                    const densityIndex = Math.min(
                        this.densityChars.length - 1,
                        Math.floor(luminance * this.densityChars.length)
                    )
                    brightCells.push(this.densityChars[densityIndex])
                    dimCells.push(" ")
                    continue
                }

                if (luminance < 0.13) {
                    brightCells.push(" ")
                    dimCells.push(" ")
                    continue
                }

                const densityIndex = Math.min(
                    this.densityChars.length - 1,
                    Math.floor(luminance * this.densityChars.length)
                )
                brightCells.push(" ")
                dimCells.push(this.densityChars[densityIndex])
            }

            brightLines.push(brightCells.join(""))
            dimLines.push(dimCells.join(""))
        }

        while (brightLines.length < this.rows) {
            brightLines.push(" ".repeat(this.columns))
            dimLines.push(" ".repeat(this.columns))
        }

        return {
            bright: brightLines.join("\n"),
            dim: dimLines.join("\n"),
        }
    }

    renderBackground() {
        if (!this.backgroundLayer) {
            return
        }
        this.backgroundLayer.textContent = ""
    }

    fract(value) {
        return value - Math.floor(value)
    }

    random() {
        this.rngState = (1664525 * this.rngState + 1013904223) >>> 0
        return this.rngState / 4294967296
    }

    randomRange(min, max) {
        return min + this.random() * (max - min)
    }

    getCacheKey() {
        return [
            this.cacheVersion,
            this.variant.id,
            this.columns,
            this.rows,
            this.artRows,
            this.frameColumns,
            this.frameRows,
        ].join(":")
    }

    loadFramesFromCache() {
        try {
            const raw = localStorage.getItem(this.getCacheKey())

            if (!raw) {
                return false
            }

            const parsed = JSON.parse(raw)

            if (
                !parsed ||
                !Array.isArray(parsed.frames) ||
                !this.isToneFrame(parsed.blinkFrame)
            ) {
                return false
            }

            this.frameCache = new Map(parsed.frames)
            this.blinkFrame = parsed.blinkFrame
            return this.frameCache.size > 0
        } catch {
            return false
        }
    }

    saveFramesToCache() {
        try {
            localStorage.setItem(
                this.getCacheKey(),
                JSON.stringify({
                    frames: Array.from(this.frameCache.entries()),
                    blinkFrame: this.blinkFrame,
                })
            )
        } catch {
            // Ignore storage failures and keep runtime rendering working.
        }
    }

    isToneFrame(frame) {
        return Boolean(
            frame &&
            typeof frame === "object" &&
            typeof frame.bright === "string" &&
            typeof frame.dim === "string"
        )
    }

    handlePointerMove(event) {
        this.pointer.x = event.clientX
        this.pointer.y = event.clientY
        this.pointer.active = true
        this.idleStart = performance.now()
        this.pendingIdleBlink = false
    }

    handlePointerLeave() {
        this.pointer.active = false
        this.idleStart = performance.now()
    }

    handleWheel(event) {
        event.preventDefault()
        const now = performance.now()
        this.scrollY = event.deltaY > 0 ? this.frameRows - 1 : 0
        this.scrollUntil = now + 480
        this.pointer.active = false
        if (!this.isBlinking) {
            this.startBlink(now, 90)
        }
    }

    handleClick() {
        const now = performance.now()
        this.startBlink(now, 70)
        window.setTimeout(() => {
            this.startBlink(performance.now(), 160)
        }, 120)
    }

    handleContextMenu(event) {
        if (event.target.closest("input, textarea")) {
            return
        }
        event.preventDefault()
        const now = performance.now()
        this.avertX = event.clientX < window.innerWidth / 2 ? this.frameColumns - 1 : 0
        this.avertUntil = now + 900
        this.pointer.active = false
        this.startBlink(now, 220)
    }

    getTrackedFrame() {
        const rect = this.element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const maxDistanceX = Math.max(1, rect.width * 0.45)
        const maxDistanceY = Math.max(1, rect.height * 0.24)
        const deltaX = (this.pointer.x - centerX) / maxDistanceX
        const deltaY = (this.pointer.y - centerY) / maxDistanceY

        return {
            x: this.clamp((deltaX + 1) * ((this.frameColumns - 1) / 2), 0, this.frameColumns - 1),
            y: this.clamp(deltaY * 1.55 + Math.floor(this.frameRows / 2), 0, this.frameRows - 1),
        }
    }

    getIdleFrame(timestamp) {
        const horizontalDrift = Math.sin(timestamp * 0.0011) * 1.25
        const verticalDrift = Math.sin(timestamp * 0.00063 + 1.3) * 1.05

        return {
            x: this.clamp(Math.floor(this.frameColumns / 2) + horizontalDrift, 0, this.frameColumns - 1),
            y: this.clamp(Math.floor(this.frameRows / 2) + verticalDrift * 0.9, 0, this.frameRows - 1),
        }
    }

    updateCurrentGaze(targetFrame, timestamp) {
        const deltaTime = this.lastMotionTimestamp === 0
            ? 1
            : Math.min(2.2, (timestamp - this.lastMotionTimestamp) / 16.6667)
        const deltaX = targetFrame.x - this.currentGaze.x
        const deltaY = targetFrame.y - this.currentGaze.y
        const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY))
        const baseEase = this.pointer.active ? 0.34 : 0.16
        const boostedEase = distance > 1.6 ? baseEase + 0.16 : baseEase
        const easedBlend = 1 - Math.pow(1 - boostedEase, deltaTime)

        this.currentGaze.x += deltaX * easedBlend
        this.currentGaze.y += deltaY * easedBlend
        this.lastMotionTimestamp = timestamp
    }

    getCenterFrameKey() {
        return `${Math.floor(this.frameColumns / 2)}:${Math.floor(this.frameRows / 2)}`
    }

    animate(timestamp) {
        const idleFor = timestamp - this.idleStart
        const isTracking = this.pointer.active && idleFor < 1800
        const frameInterval = isTracking ? this.activeFrameInterval : this.idleFrameInterval
        const isEnteringIdle = !isTracking && (this.wasTracking || this.pendingIdleBlink)

        if (timestamp - this.lastAnimationFrame < frameInterval) {
            requestAnimationFrame(this.animate)
            return
        }

        this.lastAnimationFrame = timestamp

        if (isEnteringIdle && !this.isBlinking) {
            this.startBlink(timestamp, 150)
            this.pendingIdleBlink = false
        } else if (timestamp >= this.nextBlinkAt && !this.isBlinking) {
            this.startBlink(timestamp)
        }

        if (this.isBlinking && timestamp >= this.blinkEndsAt) {
            this.isBlinking = false
            this.nextBlinkAt = timestamp + this.randomRange(4500, 9000)
        }

        if (this.isBlinking) {
            this.renderBlink()
        } else {
            let targetFrame
            if (timestamp < this.scrollUntil) {
                targetFrame = {
                    x: Math.floor(this.frameColumns / 2),
                    y: this.scrollY,
                }
            } else if (timestamp < this.avertUntil) {
                targetFrame = {
                    x: this.avertX,
                    y: Math.floor(this.frameRows / 2),
                }
            } else if (isTracking) {
                targetFrame = this.getTrackedFrame()
            } else {
                targetFrame = this.getIdleFrame(timestamp)
            }
            this.updateCurrentGaze(targetFrame, timestamp)

            this.renderFrame(
                `${Math.round(this.currentGaze.x)}:${Math.round(this.currentGaze.y)}`
            )
        }

        this.wasTracking = isTracking
        requestAnimationFrame(this.animate)
    }

    startBlink(timestamp, duration = 130) {
        this.isBlinking = true
        this.blinkEndsAt = timestamp + duration
    }

    renderBlink() {
        if (this.lastRenderedFrame === "blink") {
            return
        }

        this.swapFrame(this.blinkFrame, "blink")
    }

    renderFrame(frameKey, immediate = false) {
        if (this.lastRenderedFrame === frameKey) {
            return
        }

        const frame = this.frameCache.get(frameKey)
        if (!frame || (!frame.bright && !frame.dim)) {
            return
        }

        this.swapFrame(frame, frameKey, immediate)
    }

    swapFrame(frame, frameKey, _immediate = false) {
        const layer = this.layers[this.activeLayerIndex]
        if (!layer) {
            return
        }

        this.setRegionText(layer.dim, frame.dim)
        this.setRegionText(layer.bright, frame.bright)
        layer.shell.classList.add("eyes__layer--active")
        this.lastRenderedFrame = frameKey
    }

    setRegionText(regionPair, text) {
        regionPair.left.textContent = text
        regionPair.right.textContent = text
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }
}

export { EyesDisplay, CLASSIC_EYES, EYE_VARIANTS, pickEyeVariant }
