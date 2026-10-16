/// <reference lib="webworker" />

import { handleSimulationMessage } from '../core/cron/cron-simulation';

// O Worker não conhece Angular nem DOM: recebe parâmetros, calcula e responde.
addEventListener('message', ({ data }: MessageEvent<unknown>) => {
  postMessage(handleSimulationMessage(data));
});
