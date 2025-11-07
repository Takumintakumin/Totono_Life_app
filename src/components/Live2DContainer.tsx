import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { Live2DCharacterProps } from './Live2DCharacter';

interface Live2DContainerProps extends Live2DCharacterProps {
  fallback?: ReactNode;
}

export default function Live2DContainer({ fallback, ...props }: Live2DContainerProps) {
  const [Component, setComponent] = useState<ComponentType<Live2DCharacterProps> | null>(null);
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
        <div className="live2d-placeholder-text">
          module error
          <span className="live2d-placeholder-message">{error.message}</span>
        </div>
      </div>
    );
  }

  if (!Component) {
    return fallback ? <>{fallback}</> : <div className="live2d-placeholder">loading...</div>;
  }

  return <Component {...props} />;
}

