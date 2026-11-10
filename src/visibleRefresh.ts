// Revalidate open classroom views without polling background tabs.
export function watchVisibleRefresh(refresh: () => void) {
  const check = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  const timer = window.setInterval(check, 25_000);
  document.addEventListener('visibilitychange', check);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  };
}
