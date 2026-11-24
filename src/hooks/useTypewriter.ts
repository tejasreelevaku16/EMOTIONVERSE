import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export function useTypewriter(
  fullText: string,
  options?: UseTypewriterOptions
) {
  const speed = options?.speed ?? 22;
  const reducedMotion = options?.reducedMotion ?? false;
  const onCompleteRef = useRef(options?.onComplete);
  onCompleteRef.current = options?.onComplete;

  const [displayedText, setDisplayedText] = useState(reducedMotion ? fullText : '');
  const [isComplete, setIsComplete] = useState(reducedMotion || fullText.length === 0);

  useEffect(() => {
    if (reducedMotion || !fullText) {
      setDisplayedText(fullText);
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const intervalId = setInterval(() => {
      index++;
      setDisplayedText(fullText.slice(0, index));

      if (index >= fullText.length) {
        clearInterval(intervalId);
        setIsComplete(true);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [fullText, speed, reducedMotion]);

  const skip = useCallback(() => {
    setDisplayedText(fullText);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [fullText]);

  return { displayedText, isComplete, skip };
}
