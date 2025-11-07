import { lazy, Suspense, type ReactNode } from 'react';
import type { Live2DCharacterProps } from './Live2DCharacter';

const LazyLive2DCharacter = lazy(() => import('./Live2DCharacter'));

interface Live2DContainerProps extends Live2DCharacterProps {
  fallback?: ReactNode;
}

export default function Live2DContainer({ fallback, ...props }: Live2DContainerProps) {
  return (
    <Suspense
      fallback={fallback ?? (
        <div className="live2d-placeholder" aria-label="キャラクター読み込み中">
          <span className="live2d-placeholder-text">loading...</span>
        </div>
      )}
    >
      <LazyLive2DCharacter {...props} />
    </Suspense>
  );
}


