import { useEffect, useState, type ReactNode } from 'react';
import type { Live2DCharacterProps } from './Live2DCharacter';

interface Live2DContainerProps extends Live2DCharacterProps {
  fallback?: ReactNode;
}

export default function Live2DContainer({ fallback, ...props }: Live2DContainerProps) {
  const [Component, setComponent] = useState<React.ComponentType<Live2DCharacterProps> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('./Live2DCharacter')
      .then((module) => {
        if (!cancelled) {
          setComponent(() => module.default);
        }
      })
      .catch((err) => {
        console.error('[Live2D] Failed to load module:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="live2d-placeholder" role="alert">
        <span className="live2d-placeholder-text">load error</span>
      </div>
    );
  }

  if (!Component) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="live2d-placeholder" aria-label="キャラクター読み込み中">
        <span className="live2d-placeholder-text">loading...</span>
      </div>
    );
  }

  return <Component {...props} />;
}


