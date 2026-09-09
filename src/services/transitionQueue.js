export const createTransitionQueue = (limit = 2) => {
  const pending = [];
  let active = 0;
  let timer;
  const pump = () => {
    clearTimeout(timer);
    for (let index = 0; index < pending.length;) {
      const job = pending[index];
      if (job.signal?.aborted) {
        pending.splice(index, 1);
        job.resolve(null);
      } else index++;
    }
    while (active < limit) {
      const index = pending.findIndex((job) => job.ready());
      if (index < 0) break;
      const [job] = pending.splice(index, 1);
      active++;
      Promise.resolve().then(job.task).then(job.resolve, job.reject).finally(() => {
        active--;
        pump();
      });
    }
    if (pending.length) timer = setTimeout(pump, 50);
  };
  return (task, { ready = () => true, signal } = {}) => new Promise((resolve, reject) => {
    pending.push({ task, ready, signal, resolve, reject });
    pump();
  });
};
