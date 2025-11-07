import { useEffect, useRef, useState } from 'react';
import type { Application as PixiApplicationType, DisplayObject } from 'pixi.js-legacy';
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display';
import './Live2DCharacter.css';

const DEFAULT_MODEL_PATH = '/live2d/models/mao/mao_pro.model3.json';
const DEFAULT_CORE_PATH = '/live2d/core/live2dcubismcore.min.js';
const EXPRESSION_IDS = ['exp_01', 'exp_02', 'exp_03', 'exp_04', 'exp_05', 'exp_06', 'exp_07', 'exp_08'];
const TAP_MOTION_GROUP = '';
const TAP_MOTIONS = [0, 3, 4];
const PET_MOTIONS = [1, 5];
const AMBIENT_MOTIONS = [0, 2, 3, 4, 5];
const IDLE_VARIANTS = ['Idle', 'Idle_A', 'Idle_B'];
const MIN_AMBIENT_DELAY = 2500;
const MAX_AMBIENT_DELAY = 6000;
const PET_DISTANCE_THRESHOLD = 65;
const INTERACTION_COOLDOWN = 1600;

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

        const availableWidth = width;
        const availableHeight = height * (width <= 520 ? 0.32 : 0.38);

        const rawScale = Math.min(availableWidth / nativeWidth, availableHeight / nativeHeight);
        const scale = clampValue(rawScale * (width <= 520 ? 0.13 : 0.15), 0.048, 0.1);

        if (typeof model.scale === 'object' && 'set' in model.scale) {
          (model.scale as { set: (x: number, y?: number) => void }).set(scale);
        }

        const posX = width / 2;
        const modelHeight = nativeHeight * scale;
        const topMargin = height * (width <= 520 ? 0.07 : 0.055);
        const bottomMargin = height * (width <= 520 ? 0.06 : 0.07);
        const minY = modelHeight / 2 + topMargin;
        const targetY = height - bottomMargin - modelHeight / 2;
        model.position?.set?.(posX, Math.max(minY, targetY));

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

        let elapsed = 0;
        const tickerCallback = (delta: number) => {
          const currentModel = modelRef.current;
          if (!currentModel) return;
          const normalizedDelta = delta * 1.85;
          elapsed += normalizedDelta;

          currentModel.update?.(normalizedDelta);

          if (elapsed > 60 * 9) {
            elapsed = 0;
            rotateIdleVariant();
          }
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

        function rotateIdleVariant() {
          const currentModel = modelRef.current;
          if (!currentModel) return;
          const available = IDLE_VARIANTS.filter(Boolean);
          if (available.length <= 1) return;
          const currentIndex = available.findIndex((group) => group === idleMotionGroup);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % available.length : 0;
          try {
            currentModel.internalModel?.motionManager?.stopAllMotions();
            currentModel.motion?.(available[nextIndex], 0);
          } catch (error) {
            console.warn('[Live2D] Idle rotation failed:', error);
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
            const motionIndex = TAP_MOTIONS[Math.floor(Math.random() * TAP_MOTIONS.length)] ?? 0;
            const triggered = triggerMotion(TAP_MOTION_GROUP, motionIndex, { force: true });
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
              const motionIndex = PET_MOTIONS[Math.floor(Math.random() * PET_MOTIONS.length)] ?? 0;
              pointerState.hasDragged = triggerMotion(TAP_MOTION_GROUP, motionIndex, { force: true });
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

            if (Math.random() < 0.4) {
              triggerExpression(getRandomExpression());
            } else {
              const motionIndex = AMBIENT_MOTIONS[Math.floor(Math.random() * AMBIENT_MOTIONS.length)] ?? 0;
              triggerMotion(TAP_MOTION_GROUP, motionIndex, { force: true });
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

