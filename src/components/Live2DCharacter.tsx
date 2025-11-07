import { useEffect, useRef, useState } from 'react';
import type { Application, DisplayObject } from 'pixi.js-legacy';
import type { Live2DModel } from 'pixi-live2d-display';
import './Live2DCharacter.css';

const MODEL_PATH = '/live2d/models/haru/Haru.model3.json';
const CORE_SCRIPT_PATH = '/live2d/core/live2dcubismcore.min.js';

async function ensureCubismCoreLoaded(): Promise<void> {
  if ((window as unknown as { Live2DCubismCore?: unknown }).Live2DCubismCore) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CORE_SCRIPT_PATH}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Live2D Cubism Core script failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = CORE_SCRIPT_PATH;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Live2D Cubism Core script failed to load'));
    document.body.appendChild(script);
  });
}

export interface Live2DCharacterProps {
  width?: number;
  height?: number;
  idleMotionGroup?: string;
}

type Live2DCharAction = 'morning' | 'night' | 'miss' | 'blink';
type Live2DModelInstance = Live2DModel & DisplayObject;

export default function Live2DCharacter({
  width = 320,
  height = 360,
  idleMotionGroup = 'Idle',
}: Live2DCharacterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const modelRef = useRef<Live2DModelInstance | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let previousHandler: ((action: Live2DCharAction) => void) | undefined;

    const setup = async () => {
      await ensureCubismCoreLoaded();

      const [PIXI, tickerModule, live2dModule] = await Promise.all([
        import('pixi.js-legacy'),
        import('@pixi/ticker'),
        import('pixi-live2d-display/cubism4'),
      ]);

      const { Application: PixiApplication } = PIXI;
      const { Ticker } = tickerModule;
      const { Live2DModel } = live2dModule;

      if (cancelled || !containerRef.current) {
        return;
      }

      const app = new PixiApplication({
        width,
        height,
        view: undefined,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
      });

      const canvas = app.view as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      if (cancelled || !containerRef.current) {
        app.destroy(true, { children: true });
        return;
      }

      containerRef.current.appendChild(canvas);
      appRef.current = app;

      const sharedTicker = Ticker.shared;

      try {
        (Live2DModel as unknown as { registerTicker?: (ticker: typeof sharedTicker) => void }).registerTicker?.(sharedTicker);
      } catch (e) {
        console.warn('[Live2D] Failed to register ticker:', e);
      }

      const model = (await Live2DModel.from(MODEL_PATH, {
        autoUpdate: true,
      })) as unknown as Live2DModelInstance;

      model.autoUpdate = false;

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      const interactiveModel = model as unknown as { interactive?: boolean; buttonMode?: boolean; cursor?: string };
      interactiveModel.interactive = true;
      interactiveModel.buttonMode = true;
      interactiveModel.cursor = 'pointer';
      model.anchor.set(0.5, 0.5);
      model.position.set(width / 2, height * 0.9);
      const scale = Math.min(width / 280, height / 360);
      if ('scale' in model) {
        (model.scale as { set: (x: number, y?: number) => void }).set(scale);
      }

      model.on('pointertap', () => {
        triggerMotion('TapBody');
      });

      app.stage.addChild(model as unknown as never);
      modelRef.current = model;
      setIsReady(true);

      startIdleMotion();

      app.ticker.add((delta) => {
        model.update(delta);
      });

      previousHandler = window.charAction as ((action: Live2DCharAction) => void) | undefined;
      window.charAction = (action: Live2DCharAction) => {
        previousHandler?.(action);
        switch (action) {
          case 'morning':
          case 'night':
            triggerMotion('TapBody');
            break;
          case 'miss':
            triggerExpression('F05');
            break;
          case 'blink':
            triggerExpression('F01');
            break;
          default:
            break;
        }
      };
    };

    const startIdleMotion = () => {
      const model = modelRef.current;
      if (!model) return;
      const motionManager = model.internalModel.motionManager;
      if (!motionManager) return;
      motionManager.stopAllMotions();
      model.motion(idleMotionGroup, 0);
    };

    const triggerMotion = (group: string) => {
      const model = modelRef.current;
      if (!model) return;
      try {
        model.motion(group, 0);
      } catch (error) {
        // Fallback to idle motion if requested group not found
        startIdleMotion();
        console.warn('[Live2D] Motion trigger failed:', error);
      }
    };

    const triggerExpression = (expression: string) => {
      const model = modelRef.current;
      if (!model) return;
      try {
        model.expression(expression);
      } catch (error) {
        console.warn('[Live2D] Expression trigger failed:', error);
      }
    };

    setup().catch((error) => {
      console.error('[Live2D] Initialization failed:', error);
    });

    return () => {
      cancelled = true;
      if (previousHandler) {
        window.charAction = previousHandler;
      } else {
        delete window.charAction;
      }

      if (modelRef.current) {
        modelRef.current.destroy({ children: true, texture: true, baseTexture: true });
        modelRef.current = null;
      }

      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [height, idleMotionGroup, width]);

  return (
    <div
      ref={containerRef}
      className="live2d-character"
      style={{ width: '100%', height: '100%', position: 'relative' }}
      aria-live="polite"
    >
      {!isReady && <div className="live2d-loading">読み込み中...</div>}
    </div>
  );
}


