import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import {
  findLargestFittingFontSize,
  getFocusFontSizeRange,
  getFocusTextLayout
} from './focus-reading';

export function useFocusTextFit({
  enabled,
  showTranslation,
  containerRef,
  englishRef,
  translationRef
}: {
  enabled: boolean;
  showTranslation: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  englishRef: RefObject<HTMLParagraphElement | null>;
  translationRef: RefObject<HTMLParagraphElement | null>;
}) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const english = englishRef.current;
    if (!container || !english) return;

    let frame = 0;
    const fitText = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      const layout = getFocusTextLayout(width, height, showTranslation);
      container.dataset.layout = layout;
      const translation = translationRef.current;
      const { min: minSize, max: maxSize } = getFocusFontSizeRange(width, height);
      const fits = (englishSize: number) => {
        const translationSize = Math.max(18, Math.round(englishSize * 0.52));
        container.style.setProperty('--focus-english-size', `${englishSize}px`);
        container.style.setProperty('--focus-translation-size', `${translationSize}px`);
        const englishFits =
          english.scrollHeight <= english.clientHeight + 1 && english.scrollWidth <= english.clientWidth + 1;
        const translationFits =
          !showTranslation ||
          !translation ||
          (translation.scrollHeight <= translation.clientHeight + 1 &&
            translation.scrollWidth <= translation.clientWidth + 1);
        return englishFits && translationFits;
      };
      const size = findLargestFittingFontSize({
        min: minSize,
        max: maxSize,
        fits
      });
      container.style.setProperty('--focus-english-size', `${size}px`);
      container.style.setProperty('--focus-translation-size', `${Math.max(18, Math.round(size * 0.52))}px`);
    };
    const scheduleFit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fitText);
    };

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);
    scheduleFit();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [containerRef, enabled, englishRef, showTranslation, translationRef]);
}
