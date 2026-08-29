import { Button } from '@/components/ui/button'
import SignaturePadLibrary, { type PointGroup } from 'signature_pad'
import { useEffect, useRef, useState } from 'react'

type SignaturePadProps = {
  disabled?: boolean
  onChange: (dataUrl: string) => void
}

type CanvasSize = {
  height: number
  pixelRatio: number
  width: number
}

const emptyCanvasSize: CanvasSize = {
  height: 0,
  pixelRatio: 0,
  width: 0,
}

function scaleSignatureData(data: PointGroup[], scaleX: number, scaleY: number) {
  return data.map((group) => ({
    ...group,
    points: group.points.map((point) => ({
      ...point,
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }))
}

export function SignaturePad({ disabled, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLibrary | null>(null)
  const canvasSizeRef = useRef(emptyCanvasSize)
  const onChangeRef = useRef(onChange)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signaturePad = new SignaturePadLibrary(canvas, {
      backgroundColor: '#ffffff',
      maxWidth: 3,
      minDistance: 1,
      minWidth: 1,
      penColor: '#0f2740',
      throttle: 8,
    })
    signaturePadRef.current = signaturePad

    function emitSignature() {
      const hasDrawing = !signaturePad.isEmpty()
      setHasSignature(hasDrawing)
      onChangeRef.current(hasDrawing ? signaturePad.toDataURL('image/png') : '')
    }

    function resizeCanvas() {
      const currentCanvas = canvasRef.current
      if (!currentCanvas) return

      const bounds = currentCanvas.getBoundingClientRect()
      const width = Math.max(Math.round(bounds.width), 1)
      const height = Math.max(Math.round(bounds.height), 1)
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 1)
      const previousSize = canvasSizeRef.current

      if (
        width === previousSize.width &&
        height === previousSize.height &&
        pixelRatio === previousSize.pixelRatio
      ) {
        return
      }

      const data = signaturePad.toData()
      currentCanvas.width = Math.round(width * pixelRatio)
      currentCanvas.height = Math.round(height * pixelRatio)
      currentCanvas.getContext('2d')?.scale(pixelRatio, pixelRatio)
      canvasSizeRef.current = { height, pixelRatio, width }
      signaturePad.clear()

      if (data.length > 0) {
        const scaleX = previousSize.width > 0 ? width / previousSize.width : 1
        const scaleY = previousSize.height > 0 ? height / previousSize.height : 1
        signaturePad.fromData(scaleSignatureData(data, scaleX, scaleY))
        emitSignature()
      }
    }

    function handleEndStroke() {
      emitSignature()
    }

    let resizeFrame = 0
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(resizeCanvas)
    })

    signaturePad.addEventListener('endStroke', handleEndStroke)
    resizeCanvas()
    resizeObserver.observe(canvas)

    return () => {
      window.cancelAnimationFrame(resizeFrame)
      resizeObserver.disconnect()
      signaturePad.removeEventListener('endStroke', handleEndStroke)
      signaturePad.off()
      signaturePadRef.current = null
      canvasSizeRef.current = emptyCanvasSize
    }
  }, [])

  useEffect(() => {
    const signaturePad = signaturePadRef.current
    if (!signaturePad) return

    if (disabled) {
      signaturePad.off()
    } else {
      signaturePad.on()
    }
  }, [disabled])

  function clearCanvas() {
    signaturePadRef.current?.clear()
    setHasSignature(false)
    onChangeRef.current('')
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-md border bg-white shadow-inner sm:h-40"
        aria-disabled={disabled}
        aria-label="Draw your signature"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hasSignature ? 'Signature captured' : null}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={disabled}>
          Clear signature
        </Button>
      </div>
    </div>
  )
}
