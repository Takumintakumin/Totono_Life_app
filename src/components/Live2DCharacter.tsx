import { useEffect, useRef, useState } from 'react';
import type { Application as PixiApplicationType, DisplayObject } from 'pixi.js-legacy';
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display';
import './Live2DCharacter.css';

const DEFAULT_MODEL_PATH = '/live2d/models/mao/mao_pro.model3.json';
const DEFAULT_CORE_PATH = '/live2d/core/live2dcubismcore.min.js';

type Live2DModelInstance = Live2DModelType & DisplayObject & {
  autoUpdate?: boolean;
  update?: (delta: number) => void;
};

export interface Live2DCharacterProps {
  width?: number;
  height?: number;
  idleMotionGroup?: string;
  modelPath?: string;
  corePath?: string;
}

export default function Live2DCharacter({
  width = 320,
  height = 360,
  idleMotionGroup = 'Idle',
  modelPath = DEFAULT_MODEL_PATH,
  corePath = DEFAULT_CORE_PATH,
}: Live2DCharacterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplicationType | null>(null);
  const modelRef = useRef<Live2DModelInstance | null>(null);
  const tickerCallbackRef = useRef<((delta: number) => void) | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let previousHandler = window.charAction;

    const setup = async () => {
      try {
        await ensureCubismCoreLoaded(corePath);

        const [pixiModule, live2dModule] = await Promise.all([
          import('pixi.js-legacy'),
          import('pixi-live2d-display/cubism4'),
        ]);

        if (cancelled || !containerRef.current) {
          return;
        }

        const { Application } = pixiModule as unknown as {
          Application: typeof import('pixi.js-legacy').Application;
        };
        const { Live2DModel } = live2dModule;

        const app = new Application({
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

        containerRef.current.appendChild(canvas);
        appRef.current = app;

        (Live2DModel as unknown as { registerTicker?: (ticker: { shared: typeof app.ticker }) => void }).registerTicker?.({
          shared: app.ticker,
        });

        const model = (await Live2DModel.from(modelPath, {
          autoUpdate: true,
        })) as unknown as Live2DModelInstance;

        if (cancelled) {
          model.destroy({ children: true, texture: true, baseTexture: true });
          app.destroy(true, { children: true });
          return;
        }

        model.autoUpdate = false;

        model.anchor?.set?.(0.5, 0.5);

        const coreModel = (model.internalModel as unknown as {
          coreModel?: {
            getCanvasWidth?: () => number;
            getCanvasHeight?: () => number;
          };
        })?.coreModel;

        const nativeWidth = coreModel?.getCanvasWidth?.() ?? 1;
        const nativeHeight = coreModel?.getCanvasHeight?.() ?? 1;
        const horizontalMargin = Math.max(width * 0.24, 104);
        const verticalMargin = Math.max(height * 0.26, 112);
        const availableWidth = Math.max(width - horizontalMargin * 2, 1);
        const availableHeight = Math.max(height - verticalMargin * 2, 1);
        const rawScale = Math.min(availableWidth / nativeWidth, availableHeight / nativeHeight);
        const MIN_SCALE = 0.15;
        const MAX_SCALE = 0.58;

        const scaledRaw = Math.min(rawScale, MAX_SCALE);
        const growthRange = Math.max(scaledRaw - MIN_SCALE, 0);
        const responsiveFactor = Math.min(Math.max((Math.min(width, height) - 720) / 1120, 0), 1);
        const scale = Math.min(MAX_SCALE, MIN_SCALE + growthRange * responsiveFactor);

        if (typeof model.scale === 'object' && 'set' in model.scale) {
          (model.scale as { set: (x: number, y?: number) => void }).set(scale);
        }

        const halfModelHeight = (nativeHeight * scale) / 2;
        const posX = width / 2;
        const posY = height - verticalMargin - halfModelHeight;
        model.position?.set?.(posX, Math.max(halfModelHeight + verticalMargin * 0.5, posY));

        const interactiveModel = model as unknown as {
          interactive?: boolean;
          buttonMode?: boolean;
          cursor?: string;
          on?: (event: string, fn: () => void) => void;
        };
        interactiveModel.interactive = true;
        interactiveModel.buttonMode = true;
        interactiveModel.cursor = 'pointer';
        interactiveModel.on?.('pointertap', () => triggerMotion('Idle'));

        app.stage.addChild(model as unknown as never);
        modelRef.current = model;

        const tickerCallback = (delta: number) => {
          model.update?.(delta);
        };
        tickerCallbackRef.current = tickerCallback;
        app.ticker.add(tickerCallback);

        setStatus('ready');
        startIdleMotion();

        window.charAction = (action) => {
          previousHandler?.(action);
          switch (action) {
            case 'morning':
            case 'night':
              triggerMotion('Idle');
              break;
            case 'miss':
              triggerExpression('exp_05');
              break;
            case 'blink':
              triggerExpression('exp_01');
              break;
            default:
              break;
          }
        };

        function startIdleMotion() {
          const currentModel = modelRef.current;
          if (!currentModel) return;
          try {
            currentModel.internalModel?.motionManager?.stopAllMotions();
            currentModel.motion?.(idleMotionGroup, 0);
          } catch (error) {
            console.warn('[Live2D] Idle motion failed:', error);
          }
        }

        function triggerMotion(group: string) {
          const currentModel = modelRef.current;
          if (!currentModel) return;
          try {
            currentModel.motion?.(group, 0);
          } catch (error) {
            console.warn('[Live2D] Motion trigger failed:', error);
          }
        }

        function triggerExpression(expression: string) {
          const currentModel = modelRef.current;
          if (!currentModel) return;
          try {
            currentModel.expression?.(expression);
          } catch (error) {
            console.warn('[Live2D] Expression trigger failed:', error);
          }
        }
      } catch (error) {
        console.error('[Live2D] Initialization failed:', error);
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (previousHandler) {
        window.charAction = previousHandler;
      } else {
        delete window.charAction;
      }

      if (appRef.current && tickerCallbackRef.current) {
        appRef.current.ticker.remove(tickerCallbackRef.current);
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
  }, [corePath, height, idleMotionGroup, modelPath, width]);

  return (
    <div ref={containerRef} className="live2d-character" style={{ width: '100%', height: '100%' }}>
      {status === 'loading' && <div className="live2d-placeholder">loading...</div>}
      {status === 'error' && (
        <div className="live2d-placeholder" role="alert">
          <div className="live2d-placeholder-text">
            failed to load
            <span className="live2d-placeholder-message">{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

async function ensureCubismCoreLoaded(src: string): Promise<void> {
  if ((window as unknown as { Live2DCubismCore?: unknown }).Live2DCubismCore) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('failed to load Cubism Core script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed to load Cubism Core script'));
    document.body.appendChild(script);
  });
}

