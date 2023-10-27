export * from './image';
export * from './task';

export const removeUndefined = (obj) => {
  for (const key in obj) {
    if (obj[key] === undefined) {
      delete obj[key]; // Remove the property if its value is undefined
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      removeUndefined(obj[key]); // Recursively remove undefined properties for nested objects
    }
  }
}