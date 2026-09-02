class EyesDisplay {
    constructor(element) {
        this.element = element
        this.sourceWidth = 288
        this.sourceHeight = 112
        this.columns = 64
        this.rows = 28
        this.artRows = 28
        this.frameColumns = 9
        this.frameRows = 7
        this.cacheVersion = "eyes-v18"
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
        this.handleEyeHoverMove = this.handleEyeHoverMove.bind(this)
        this.handleEyeHoverLeave = this.handleEyeHoverLeave.bind(this)
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
            await this.buildFrames()
        }
        this.observeResize()
        window.addEventListener("mousemove", this.handlePointerMove)
        window.addEventListener("mouseleave", this.handlePointerLeave)
        this.element.addEventListener("mousemove", this.handleEyeHoverMove)
        this.element.addEventListener("mouseleave", this.handleEyeHoverLeave)
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
        probe.style.font = getComputedStyle(this.element).font
        document.body.appendChild(probe)
        const rect = probe.getBoundingClientRect()
        probe.remove()

        return {
            width: rect.width || 1,
            height: rect.height || 1,
        }
    }

    updateGridSize() {
        const rect = this.element.getBoundingClientRect()
        const metrics = this.measureCharacter()
        const horizontalPadding = 2
        const verticalPadding = 2
        const nextColumns = Math.floor((rect.width - horizontalPadding) / metrics.width)
        const maxRows = Math.floor((rect.height - verticalPadding) / metrics.height)
        const aspectRows = Math.floor(
            (Math.max(64, nextColumns) * metrics.width) /
            ((this.sourceWidth / this.sourceHeight) * metrics.height)
        )

        this.columns = Math.max(64, nextColumns)
        this.rows = Math.max(20, maxRows)
        this.artRows = Math.max(18, Math.min(maxRows, aspectRows))
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
        const centerColumn = Math.floor(this.frameColumns / 2)
        const centerRow = Math.floor(this.frameRows / 2)
        const normalizedX = (frameX - centerColumn) / Math.max(1, centerColumn)
        const normalizedY = (frameY - centerRow) / Math.max(1, centerRow)
        const socketOffsetX = normalizedX * 1.8
        const socketOffsetY = normalizedY * 1.15
        const pupilOffsetX = normalizedX * 12.5
        const pupilOffsetY = normalizedY * 6.2
        const leftCenterX = 72 + socketOffsetX
        const rightCenterX = 216 + socketOffsetX
        const centerY = 56 + socketOffsetY
        const eyeHalfWidth = 49
        const irisRadiusX = 12
        const irisRadiusY = 13.6
        const pupilRadiusX = 3.7
        const pupilRadiusY = 16.7
        const pupilShadowRadiusX = pupilRadiusX + 2.1
        const pupilShadowRadiusY = pupilRadiusY + 1.1
        const upperEase = normalizedY * -0.85
        const lowerEase = Math.max(0, normalizedY) * 0.5
        const eyeShape = (cx) =>
            `M ${cx - eyeHalfWidth} ${centerY + 4}
             C ${cx - 29} ${centerY - 18.5 - upperEase} ${cx + 18} ${centerY - 16.5 - upperEase} ${cx + eyeHalfWidth} ${centerY}
             C ${cx + 25} ${centerY + 7.5 - lowerEase} ${cx - 24} ${centerY + 15.5 - lowerEase} ${cx - eyeHalfWidth} ${centerY + 4} Z`
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
            <clipPath id="left-eye">
              <path d="${eyeShape(leftCenterX)}" />
            </clipPath>
            <clipPath id="right-eye">
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
          <g clip-path="url(#left-eye)">
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${irisRadiusX}" ry="${irisRadiusY}" fill="#726b63"/>
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilShadowRadiusX}" ry="${pupilShadowRadiusY}" fill="#0d0c0b" opacity="0.78"/>
            <ellipse cx="${leftCenterX + pupilOffsetX}" cy="${centerY + pupilOffsetY}" rx="${pupilRadiusX}" ry="${pupilRadiusY}" fill="#000000"/>
            <circle cx="${leftCenterX + pupilOffsetX - 4}" cy="${centerY + pupilOffsetY - 5.3}" r="1.25" fill="#f4f1e8"/>
            <path d="M ${leftStart + 3} ${centerY + 4} Q ${leftCenterX - 1} ${centerY - 6.8} ${leftEnd - 3} ${centerY + 1}" fill="none" stroke="#9c9488" stroke-width="6.1" stroke-linecap="round" opacity="0.36"/>
          </g>
          <g clip-path="url(#right-eye)">
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

        const backgroundText = Array.from(
            { length: this.rows },
            () => this.densityChars[0].repeat(this.columns)
        ).join("\n")

        this.backgroundLayer.textContent = backgroundText
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

    handleEyeHoverMove(event) {
        const rect = this.element.getBoundingClientRect()
        const normalizedX = (event.clientX - rect.left) / Math.max(1, rect.width)
        const normalizedY = (event.clientY - rect.top) / Math.max(1, rect.height)
        const hoveredEye = this.resolveHoveredEye(normalizedX, normalizedY)

        this.setHoveredEye(hoveredEye)
    }

    handleEyeHoverLeave() {
        this.setHoveredEye("")
    }

    resolveHoveredEye(normalizedX, normalizedY) {
        const isWithinEye = (centerX) => {
            const deltaX = (normalizedX - centerX) / 0.19
            const deltaY = (normalizedY - 0.5) / 0.29

            return deltaX * deltaX + deltaY * deltaY <= 1
        }

        if (isWithinEye(0.25)) {
            return "left"
        }

        if (isWithinEye(0.75)) {
            return "right"
        }

        return ""
    }

    setHoveredEye(side) {
        if (this.hoveredEye === side) {
            return
        }

        this.hoveredEye = side

        if (side) {
            this.element.dataset.agitate = side
            return
        }

        delete this.element.dataset.agitate
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
            const targetFrame = isTracking
                ? this.getTrackedFrame()
                : this.getIdleFrame(timestamp)
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

        this.swapFrame(
            this.frameCache.get(frameKey) ?? { bright: "", dim: "" },
            frameKey,
            immediate
        )
    }

    swapFrame(frame, frameKey, immediate = false) {
        const nextLayerIndex = immediate ? this.activeLayerIndex : 1 - this.activeLayerIndex
        const nextLayer = this.layers[nextLayerIndex]
        const currentLayer = this.layers[this.activeLayerIndex]

        this.setRegionText(nextLayer.dim, frame.dim)
        this.setRegionText(nextLayer.bright, frame.bright)
        nextLayer.shell.classList.add("eyes__layer--active")

        if (currentLayer && currentLayer !== nextLayer) {
            currentLayer.shell.classList.remove("eyes__layer--active")
        }

        this.activeLayerIndex = nextLayerIndex
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

export { EyesDisplay }
