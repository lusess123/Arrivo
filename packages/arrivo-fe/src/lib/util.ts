export const asyncHandle = <T, U = any>(
  promise: Promise<T>,
): Promise<[U | null, T | null]> => {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.reject(new Error('requires promises as the param')).catch(
      (err: U) => {
        return [err, null];
      },
    );
  }

  return promise
    .then((result: T): [null, T] => {
      return [null, result];
    })
    .catch((err: U): [U, null] => {
      return [err, null];
    });
};

// Safely stringify an object while handling functions and circular references
// export const formatObject = (
//   obj: any,
//   indent: number = 2,
// ): string => {
//   // WeakMap to store already visited objects along with their reference path
//   const seen = new WeakMap<any, string>();
//
//   // Helper to build a dot/bracket–notation path string
//   const buildPath = (parentPath: string, key: string | number): string => {
//     if (parentPath === '') return typeof key === 'number' ? `[${key}]` : key;
//     return typeof key === 'number'
//       ? `${parentPath}[${key}]`
//       : `${parentPath}.${key}`;
//   };
//
//   // Use JSON.stringify with a custom replacer to intercept values
//   const result = JSON.stringify(
//     obj,
//     function (this: any, key: string, value: any) {
//       // Handle functions explicitly
//       if (typeof value === 'function') {
//         return `[Function ${value.name || 'anonymous'}]`;
//       }
//
//       // Handle objects (including arrays) & detect circular references
//       if (value && typeof value === 'object') {
//         if (seen.has(value)) {
//           return `[Circular → ${seen.get(value)}]`;
//         }
//         // Determine the current path for this object
//         const parentPath = key === '' ? '' : seen.get(this) || '';
//         const currentPath = key === '' ? 'root' : buildPath(parentPath, key);
//         seen.set(value, currentPath);
//       }
//
//       return value;
//     },
//     indent,
//   );
//
//   return result;
// };
