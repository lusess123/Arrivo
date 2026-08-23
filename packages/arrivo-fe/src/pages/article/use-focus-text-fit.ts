import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import {
  doFocusTextRegionsFit,
  findLargestFittingFontSize,
  getFocusFontSizeRange,
  getFocusTextLayout,
  type FocusTextRegionMetrics
} from './focus-reading';

const getTranslationFontSize = (englishSize: number) =>
  Math.max(1, Math.round(englishSize * 0.55));

export function useFocusTextFit({
  enabled,
  showOriginal,
  showTranslation,
  containerRef,
  englishRegionRef,
  englishRef,
  translationRegionRef,
  translationRef
}: {
  enabled: boolean;
  showOriginal: boolean;
  showTranslation: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  englishRegionRef: RefObject<HTMLDivElement | null>;
  englishRef: RefObject<HTMLParagraphElement | null>;
  translationRegionRef: RefObject<HTMLDivElement | null>;
  translationRef: RefObject<HTMLParagraphElement | null>;
}) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const englishRegion = englishRegionRef.current;
    const english = englishRef.current;
    const translationRegion = translationRegionRef.current;
    const translation = translationRef.current;
    if (!container) return;

    let frame = 0;
    const fitText = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      const layout = getFocusTextLayout(width, height, showOriginal, showTranslation);
      container.dataset.layout = layout;
      if (!showOriginal && !showTranslation) {
        container.dataset.textOverflow = 'false';
        return;
      }
      const { min: minSize, max: maxSize } = getFocusFontSizeRange(width, height);
      const fits = (baseSize: number) => {
        const translationSize = showOriginal ? getTranslationFontSize(baseSize) : baseSize;
        container.style.setProperty('--focus-english-size', `${baseSize}px`);
        container.style.setProperty('--focus-translation-size', `${translationSize}px`);
        const regions: FocusTextRegionMetrics[] = [];
        if (showOriginal && englishRegion && english) {
          regions.push({
            availableWidth: englishRegion.clientWidth,
            availableHeight: englishRegion.clientHeight,
            contentWidth: english.scrollWidth,
            contentHeight: english.scrollHeight
          });
        }
        if (showTranslation && translationRegion && translation) {
          regions.push({
            availableWidth: translationRegion.clientWidth,
            availableHeight: translationRegion.clientHeight,
            contentWidth: translation.scrollWidth,
            contentHeight: translation.scrollHeight
          });
        }
        return doFocusTextRegionsFit(regions);
      };
      const size = findLargestFittingFontSize({
        min: minSize,
        max: maxSize,
        fits
      });
      const fittedSize = size ?? minSize;
      container.dataset.textOverflow = size === null ? 'true' : 'false';
      container.style.setProperty('--focus-english-size', `${fittedSize}px`);
      container.style.setProperty(
        '--focus-translation-size',
        `${showOriginal ? getTranslationFontSize(fittedSize) : fittedSize}px`
      );
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
  }, [
    containerRef,
    enabled,
    englishRef,
    englishRegionRef,
    showOriginal,
    showTranslation,
    translationRef,
    translationRegionRef
  ]);
}
