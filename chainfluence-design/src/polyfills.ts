/**
 * Browser polyfills for Node.js APIs used by @ton/core and related packages.
 * Must be imported first in main.tsx.
 */
import { Buffer } from 'buffer';

// @ton/core expects Buffer on the global object
(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
