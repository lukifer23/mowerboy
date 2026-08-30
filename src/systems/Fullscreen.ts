export function isFullscreen(): boolean {
  const legacy = document as Document & { webkitFullscreenElement?: Element };
  return Boolean(document.fullscreenElement ?? legacy.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<boolean> {
  const legacyDocument = document as Document & {
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.fullscreenElement ?? legacyDocument.webkitFullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await legacyDocument.webkitExitFullscreen?.();
      return false;
    }
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    return isFullscreen();
  } catch {
    return false;
  }
}
