import { useEffect, useRef, useState } from 'react';
import type { Application as PixiApplicationType, DisplayObject } from 'pixi.js-legacy';
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display';
import './Live2DCharacter.css';

const DEFAULT_MODEL_PATH = '/live2d/models/mao/mao_pro.model3.json';
const DEFAULT_CORE_PATH = '/live2d/core/live2dcubismcore.min.js';
const EXPRESSION_IDS = ['exp_01', 'exp_02', 'exp_03', 'exp_04', 'exp_05', 'exp_06', 'exp_07', 'exp_08'];
const EXTRA_MOTION_GROUP = '';
const EXTRA_MOTION_COUNT = 6;
const MIN_AMBIENT_DELAY = 7000;
const MAX_AMBIENT_DELAY = 13000;
const TAP_MOTION_INDEX = 0;
const PET_MOTION_INDEX = 1;
const PET_DISTANCE_THRESHOLD = 65;
const INTERACTION_COOLDOWN = 4500;

type Live2DModelInstance = Live2DModelType & DisplayObject & {
  autoUpdate?: boolean;
  update?: (delta: number) => void;
};

type PointerInteractionEvent = {
  global?: {
    x: number;
    y: number;
  };
  data?: {
    global?: {
      x: number;
      y: number;
    };
  };
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
  const ambientTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let previousHandler = window.charAction;
    const detachInteractionHandlers: Array<() => void> = [];

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

        const layoutProfile = getLayoutProfile(width, height);
        const horizontalMargin = Math.max(width * layoutProfile.horizontalRatio, layoutProfile.minHorizontalMargin);
        const verticalMargin = Math.max(height * layoutProfile.verticalRatio, layoutProfile.minVerticalMargin);

        const availableWidth = Math.max(width - horizontalMargin * 2, 1);
        const availableHeight = Math.max(height - verticalMargin * 2, 1);

        const rawScale = Math.min(availableWidth / nativeWidth, availableHeight / nativeHeight);
        const baselineScale = rawScale * layoutProfile.scaleFactor;
        const scale = clampValue(baselineScale, layoutProfile.minScale, layoutProfile.maxScale);

        if (typeof model.scale === 'object' && 'set' in model.scale) {
          (model.scale as { set: (x: number, y?: number) => void }).set(scale);
        }

        const posX = width / 2;
        let posY = height - verticalMargin - (nativeHeight * scale) / 2;
        posY -= nativeHeight * scale * layoutProfile.verticalShift;
        const minY = (nativeHeight * scale) / 2 + verticalMargin * 0.35;
        model.position?.set?.(posX, Math.max(minY, posY));

        const interactiveModel = model as unknown as {
          interactive?: boolean;
          buttonMode?: boolean;
          cursor?: string;
          on?: (event: string, fn: (event: PointerInteractionEvent) => void) => void;
          off?: (event: string, fn: (event: PointerInteractionEvent) => void) => void;
        };
        interactiveModel.interactive = true;
        interactiveModel.buttonMode = true;
        interactiveModel.cursor = 'pointer';
        setupInteractionHandlers(interactiveModel);

        app.stage.addChild(model as unknown as never);
        modelRef.current = model;

        const tickerCallback = (delta: number) => {
          model.update?.(delta);
        };
        tickerCallbackRef.current = tickerCallback;
        app.ticker.add(tickerCallback);

        setStatus('ready');
        startIdleMotion();
        scheduleAmbientMotion();

        window.charAction = (action) => {
          previousHandler?.(action);
          let handled = false;
          switch (action) {
            case 'morning':
            case 'night':
              handled = triggerMotion(idleMotionGroup, 0, { force: true });
              break;
            case 'miss':
              triggerExpression('exp_05');
              handled = true;
              break;
            case 'blink':
              triggerExpression('exp_01');
              handled = true;
              break;
            default:
              break;
          }

          if (handled) {
            scheduleAmbientMotion(INTERACTION_COOLDOWN);
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

        function triggerMotion(group: string, index = 0, options: { force?: boolean } = {}): boolean {
          const currentModel = modelRef.current;
          if (!currentModel) return false;

          const isIdleGroup = group === idleMotionGroup;
          const shouldForce = Boolean(options.force);

          if (!isIdleGroup && !shouldForce && isMotionPlaying(currentModel)) {
            return false;
          }

          try {
            if (!isIdleGroup) {
              (currentModel.internalModel as unknown as {
                motionManager?: {
                  stopAllMotions?: () => void;
                };
              })?.motionManager?.stopAllMotions?.();
            }

            currentModel.motion?.(group, index);
            return true;
          } catch (error) {
            console.warn('[Live2D] Motion trigger failed:', error);
            return false;
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

        function setupInteractionHandlers(target: {
          on?: (event: string, fn: (event: PointerInteractionEvent) => void) => void;
          off?: (event: string, fn: (event: PointerInteractionEvent) => void) => void;
        }) {
          const pointerState = {
            isDown: false,
            hasDragged: false,
            lastX: 0,
            lastY: 0,
          } as {
            isDown: boolean;
            hasDragged: boolean;
            lastX: number;
            lastY: number;
          };

          const handlePointerTap = () => {
            pointerState.hasDragged = false;
            const triggered = triggerMotion(EXTRA_MOTION_GROUP, TAP_MOTION_INDEX, { force: true });
            if (!triggered) {
              triggerExpression(getRandomExpression());
            }
            scheduleAmbientMotion(INTERACTION_COOLDOWN + Math.random() * 1200);
          };

          const handlePointerDown = (event: PointerInteractionEvent) => {
            pointerState.isDown = true;
            pointerState.hasDragged = false;
            const position = getPointerPosition(event);
            pointerState.lastX = position.x;
            pointerState.lastY = position.y;
          };

          const handlePointerMove = (event: PointerInteractionEvent) => {
            if (!pointerState.isDown) {
              return;
            }

            const position = getPointerPosition(event);
            const dx = position.x - pointerState.lastX;
            const dy = position.y - pointerState.lastY;
            pointerState.lastX = position.x;
            pointerState.lastY = position.y;

            if (!pointerState.hasDragged && Math.hypot(dx, dy) >= PET_DISTANCE_THRESHOLD) {
              pointerState.hasDragged = triggerMotion(EXTRA_MOTION_GROUP, PET_MOTION_INDEX, { force: true });
              if (pointerState.hasDragged) {
                scheduleAmbientMotion(INTERACTION_COOLDOWN + Math.random() * 1600);
              }
            }
          };

          const handlePointerUp = () => {
            pointerState.isDown = false;
            pointerState.lastX = 0;
            pointerState.lastY = 0;
            pointerState.hasDragged = false;
          };

          target.on?.('pointertap', handlePointerTap);
          target.on?.('pointerdown', handlePointerDown);
          target.on?.('pointermove', handlePointerMove);
          target.on?.('pointerup', handlePointerUp);
          target.on?.('pointerupoutside', handlePointerUp);
          target.on?.('pointercancel', handlePointerUp);

          detachInteractionHandlers.push(() => {
            target.off?.('pointertap', handlePointerTap);
            target.off?.('pointerdown', handlePointerDown);
            target.off?.('pointermove', handlePointerMove);
            target.off?.('pointerup', handlePointerUp);
            target.off?.('pointerupoutside', handlePointerUp);
            target.off?.('pointercancel', handlePointerUp);
          });
        }

        function scheduleAmbientMotion(delayOverride?: number) {
          if (ambientTimeoutRef.current) {
            window.clearTimeout(ambientTimeoutRef.current);
          }

          const baseDelay = typeof delayOverride === 'number'
            ? Math.max(delayOverride, 2000)
            : MIN_AMBIENT_DELAY + Math.random() * (MAX_AMBIENT_DELAY - MIN_AMBIENT_DELAY);

          ambientTimeoutRef.current = window.setTimeout(() => {
            ambientTimeoutRef.current = null;

            const currentModel = modelRef.current;
            if (!currentModel) {
              return;
            }

            if (isMotionPlaying(currentModel)) {
              scheduleAmbientMotion(Math.max(baseDelay * 0.5, 1800));
              return;
            }

            if (Math.random() < 0.45) {
              triggerExpression(getRandomExpression());
            } else {
              const motionIndex = Math.floor(Math.random() * EXTRA_MOTION_COUNT);
              triggerMotion(EXTRA_MOTION_GROUP, motionIndex, { force: true });
            }

            scheduleAmbientMotion();
          }, baseDelay);
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

      if (ambientTimeoutRef.current) {
        window.clearTimeout(ambientTimeoutRef.current);
        ambientTimeoutRef.current = null;
      }

      detachInteractionHandlers.forEach((fn) => fn());
      detachInteractionHandlers.length = 0;
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

function getPointerPosition(event: PointerInteractionEvent) {
  const global = event.global ?? event.data?.global;
  return {
    x: global?.x ?? 0,
    y: global?.y ?? 0,
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLayoutProfile(width: number, height: number) {
  if (width <= 420) {
    const shift = height <= 640 ? 0.08 : 0.06;
    return {
      horizontalRatio: 0.045,
      verticalRatio: 0.08,
      minHorizontalMargin: 20,
      minVerticalMargin: 36,
      scaleFactor: 0.78,
      minScale: 0.22,
      maxScale: 0.36,
      verticalShift: shift,
    } as const;
  }

  if (width <= 640) {
    const shift = height <= 720 ? 0.06 : 0.05;
    return {
      horizontalRatio: 0.06,
      verticalRatio: 0.1,
      minHorizontalMargin: 28,
      minVerticalMargin: 48,
      scaleFactor: 0.8,
      minScale: 0.24,
      maxScale: 0.38,
      verticalShift: shift,
    } as const;
  }

  if (width <= 960) {
    const shift = height <= 820 ? 0.04 : 0.03;
    return {
      horizontalRatio: 0.08,
      verticalRatio: 0.12,
      minHorizontalMargin: 40,
      minVerticalMargin: 56,
      scaleFactor: 0.82,
      minScale: 0.26,
      maxScale: 0.4,
      verticalShift: shift,
    } as const;
  }

  const shift = height <= 900 ? 0.03 : 0.02;
  return {
    horizontalRatio: 0.1,
    verticalRatio: 0.14,
    minHorizontalMargin: 48,
    minVerticalMargin: 60,
    scaleFactor: 0.85,
    minScale: 0.28,
    maxScale: 0.42,
    verticalShift: shift,
  } as const;
}

function getRandomExpression(): string {
  return EXPRESSION_IDS[Math.floor(Math.random() * EXPRESSION_IDS.length)] ?? 'exp_01';
}

function isMotionPlaying(model: Live2DModelInstance | null): boolean {
  if (!model) return false;

  const motionManager = (model.internalModel as unknown as {
    motionManager?: {
      isFinished?: () => boolean;
      isPlaying?: () => boolean;
    };
  })?.motionManager;

  try {
    if (motionManager?.isPlaying) {
      return motionManager.isPlaying();
    }

    if (motionManager?.isFinished) {
      return !motionManager.isFinished();
    }
  } catch (error) {
    console.warn('[Live2D] motion manager status check failed:', error);
  }

  return false;
}

