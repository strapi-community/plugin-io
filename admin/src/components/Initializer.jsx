import { useEffect, useRef } from 'react';

import { PLUGIN_ID } from '../pluginId';

/**
 * @type {import('react').FC<{ setPlugin: (id: string) => void }>}
 */
const Initializer = ({ setPlugin }) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);

  return null;
};

export { Initializer };
