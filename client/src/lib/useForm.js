import { useState } from 'react';

// Minimal form state: bind('field') gives an input its value and change handler.
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const bind = (k) => ({ value: v[k] ?? '', onChange: (e) => setV((s) => ({ ...s, [k]: e.target.value })) });
  const bindCheck = (k) => ({ checked: !!v[k], onChange: (e) => setV((s) => ({ ...s, [k]: e.target.checked })) });
  const bindNested = (group, k) => ({
    value: v[group]?.[k] ?? '',
    onChange: (e) => setV((s) => ({ ...s, [group]: { ...s[group], [k]: e.target.value } })),
  });
  return { v, setV, bind, bindCheck, bindNested };
}
