import { useEffect, useState } from "react";

// Универсальный hook для периодического обновления данных.
// loader — асинхронная функция загрузки, deps — зависимости, interval_ms — частота опроса.
export default function usePolling(loader, deps = [], interval_ms = 5000) {
  const [data, set_data] = useState(null);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState(null);
  const [updated_at, set_updated_at] = useState(null);
  const [reload_tick, set_reload_tick] = useState(0);

  useEffect(() => {
    // Флаг защищает от setState после размонтирования компонента.
    let is_active = true;

    async function load() {
      try {
        const result = await loader();
        if (!is_active) return;
        set_data(result);
        set_error(null);
        set_updated_at(new Date());
      } catch (err) {
        if (!is_active) return;
        console.error(err);
        set_error(err.message || "Ошибка загрузки");
      } finally {
        if (is_active) set_is_loading(false);
      }
    }

    load();
    // После первой загрузки запускаем регулярное обновление.
    const timer = setInterval(load, interval_ms);

    return () => {
      is_active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reload_tick]);

  return {
    data,
    is_loading,
    error,
    updated_at,
    reload: () => set_reload_tick((value) => value + 1),
  };
}
