import { useEffect } from 'react';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';

/**
 * Completes the running focus/break phase when its end time passes, regardless of which tab is open.
 * Because the timer stores an absolute end time, a block that finished while the app was closed is
 * credited on the next launch.
 */
export function FocusTimerWatcher() {
  const endsAt = useGlowStore((s) => s.timer.endsAt);
  const phase = useGlowStore((s) => s.timer.phase);
  const hydrated = useGlowStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !endsAt || phase === 'idle') return;
    const finish = () => {
      const t = useGlowStore.getState().timer;
      if (t.endsAt !== endsAt) return;
      if (t.phase === 'focus') winFeedback('super');
      useGlowStore.getState().finishTimerPhase();
    };
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      finish();
      return;
    }
    const id = setTimeout(finish, remaining);
    return () => clearTimeout(id);
  }, [endsAt, phase, hydrated]);

  return null;
}
