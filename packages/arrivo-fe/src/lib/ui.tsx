import React from 'react';

/**
 * Format a JavaScript value into a React node (monospaced JSON-like string) while
 *   – displaying functions as `[Function name]`
 *   – marking circular or mutually-referenced objects as `[Circular → path]`
 */
export const formatObject = (
  obj: any,
  indent: number = 2,
): React.ReactNode => {
  const seen = new WeakMap<any, string>();

  const buildPath = (parentPath: string, key: string | number): string => {
    if (parentPath === '') return typeof key === 'number' ? `[${key}]` : key;
    return typeof key === 'number'
      ? `${parentPath}[${key}]`
      : `${parentPath}.${key}`;
  };

  const jsonString = JSON.stringify(
    obj,
    function (this: any, key: string, value: any) {
      if (typeof value === 'function') {
        return `[Function ${value.name || 'anonymous'}]`;
      }
      if (value && typeof value === 'object') {
        if (seen.has(value)) {
          return `[Circular → ${seen.get(value)}]`;
        }
        const parentPath = key === '' ? '' : seen.get(this) || '';
        const currentPath = key === '' ? 'root' : buildPath(parentPath, key);
        seen.set(value, currentPath);
      }
      return value;
    },
    indent,
  );

  return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{jsonString}</pre>;
};
