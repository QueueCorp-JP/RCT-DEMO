import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, DisplayObject, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch'
import homeStore from '@/features/stores/home'
import { EmoteController } from '@/features/emoteController/emoteController'

interface DragOffset {
  x: number
  y: number
}

const Live2DComponent = () => {
  const canvasContainerRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const [app, setApp] = useState<Application | null>(null)
  const [model, setModel] = useState<Live2DModel | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 })

  const setModelPosition = useCallback(
    (currentApp: Application, newModel: Live2DModel) => {
      if (!canvasContainerRef.current) return

      const canvas = canvasContainerRef.current
      const scale = Math.min(
        canvas.width / newModel.width,
        canvas.height / newModel.height
      )

      newModel.scale.set(scale)
      newModel.x = canvas.width / 2
      newModel.y = canvas.height / 2
    },
    []
  )

  const initApp = useCallback(() => {
    if (!canvasContainerRef.current) return

    const newApp = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      view: canvasContainerRef.current,
      backgroundAlpha: 0,
      antialias: true,
    })

    setApp(newApp)
  }, [])

  const loadLive2DModel = useCallback(
    async (currentApp: Application, modelPath: string) => {
      if (!canvasContainerRef.current) return
      const hs = homeStore.getState()

      try {
        const newModel = await Live2DModel.fromSync(modelPath, {
          ticker: Ticker.shared,
          autoHitTest: false,
          autoFocus: false,
        })

        await new Promise((resolve, reject) => {
          newModel.once('load', () => resolve(true))
          newModel.once('error', (error: Error) => reject(error))
          setTimeout(() => reject(new Error('Model load timeout')), 10000)
        })

        currentApp.stage.addChild(newModel as unknown as DisplayObject)
        newModel.anchor.set(0.5, 0.5)
        setModelPosition(currentApp, newModel)

        modelRef.current = newModel
        setModel(newModel)
        hs.live2dViewer = newModel
      } catch (error) {
        console.error('Failed to load Live2D model:', error)
      }
    },
    [setModelPosition]
  )

  useEffect(() => {
    initApp()
    return () => {
      if (modelRef.current) {
        modelRef.current.destroy()
        modelRef.current = null
      }
      if (app) {
        app.destroy(true)
      }
    }
  }, [initApp, app])

  useEffect(() => {
    if (!canvasContainerRef.current || !model) return

    const canvas = canvasContainerRef.current

    const handlePointerDown = (event: PointerEvent) => {
      setIsDragging(true)
      setDragOffset({
        x: event.clientX - model.x,
        y: event.clientY - model.y,
      })

      if (event.button !== 2) {
        model.tap(event.clientX, event.clientY)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (isDragging) {
        model.x = event.clientX - dragOffset.x
        model.y = event.clientY - dragOffset.y
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scaleChange = event.deltaY * -0.0002
      const newScale = Math.max(0.1, Math.min(2, model.scale.x + scaleChange))
      model.scale.set(newScale)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [model, isDragging, dragOffset])

  useEffect(() => {
    if (!app) return

    const modelPath = '/vrm/RCTAVATAR.vrm'
    loadLive2DModel(app, modelPath)
  }, [app, loadLive2DModel])

  return (
    <canvas
      ref={canvasContainerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        touchAction: 'none',
      }}
    />
  )
}

export default Live2DComponent
