// Robust polyfill for server-only modules during client-side PWA build
export class Readable { static from() { return new Readable(); } pipe() { return this; } on() { return this; } }
export class Writable { write() {} end() {} on() { return this; } }
export class Transform extends Readable { }
export class Duplex extends Readable { }
export class PassThrough extends Transform { }

export const pipeline = (...args: any[]) => args[args.length - 1];
export const finished = (stream: any, cb: (err?: any) => void) => cb();

export const AsyncLocalStorage = class {
  disable() {}
  getStore() {}
  run(store: any, callback: () => any) { return callback(); }
  enterWith(store: any) {}
};

export const EventEmitter = class {
  on() { return this; }
  off() { return this; }
  once() { return this; }
  emit() { return true; }
};

export const inherits = (ctor: any, superCtor: any) => {
  if (superCtor) {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  }
};

export const debuglog = () => () => {};
export const inspect = (obj: any) => String(obj);
export const format = (...args: any[]) => args.join(' ');

export const ReadableStream = globalThis.ReadableStream;
export const WritableStream = globalThis.WritableStream;
export const TransformStream = globalThis.TransformStream;

export default {
  Readable,
  Writable,
  Transform,
  Duplex,
  PassThrough,
  pipeline,
  finished,
  AsyncLocalStorage,
  EventEmitter,
  inherits,
  debuglog,
  inspect,
  format
};
