export interface KeyActionMap {
  onTogglePlay?: () => void; // Space
  onRepeatResult?: () => void; // R
  onPlayPause?: () => void; // P
  onScrubLeft?: () => void; // ArrowLeft
  onScrubRight?: () => void; // ArrowRight
  onHelp?: () => void; // H
  onStop?: () => void; // Escape
}

export function attachGhostEarKeyboard(actions: KeyActionMap): () => void {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.code) {
      case "Space":
        e.preventDefault();
        actions.onTogglePlay?.();
        break;
      case "KeyR":
        e.preventDefault();
        actions.onRepeatResult?.();
        break;
      case "KeyP":
        e.preventDefault();
        actions.onPlayPause?.();
        break;
      case "ArrowLeft":
        e.preventDefault();
        actions.onScrubLeft?.();
        break;
      case "ArrowRight":
        e.preventDefault();
        actions.onScrubRight?.();
        break;
      case "KeyH":
        e.preventDefault();
        actions.onHelp?.();
        break;
      case "Escape":
        e.preventDefault();
        actions.onStop?.();
        break;
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}
