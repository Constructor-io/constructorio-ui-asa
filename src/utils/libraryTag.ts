import version from '../version';

/** The client tag (`c`) on this library's tracking events. */
export const LIBRARY_TAG = `cio-ui-asa-${version}`;

type Options = Record<PropertyKey, unknown>;
type Method = (...args: unknown[]) => unknown;

// A proxy may only report a value other than the target's while that property could still change.
function isLocked(target: object, key: PropertyKey): boolean {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  return descriptor?.configurable === false && descriptor.writable === false;
}

function canTag(options: unknown): options is Options {
  if (!options || typeof options !== 'object' || !Object.isExtensible(options)) return false;
  return Reflect.getOwnPropertyDescriptor(options, 'version')?.configurable !== false;
}

function tagOptions(options: Options): Options {
  return new Proxy(options, {
    get: (target, key, receiver) =>
      key === 'version' ? LIBRARY_TAG : Reflect.get(target, key, receiver),
    // Events copy the options with object spread, which reads descriptors rather than `get`.
    getOwnPropertyDescriptor: (target, key) =>
      key === 'version'
        ? { value: LIBRARY_TAG, enumerable: true, configurable: true, writable: true }
        : Reflect.getOwnPropertyDescriptor(target, key),
    ownKeys: (target) => [...new Set([...Reflect.ownKeys(target), 'version'])],
    has: (target, key) => key === 'version' || Reflect.has(target, key),
  });
}

/**
 * The given tracker, but events sent through it carry LIBRARY_TAG as their client tag, so they can
 * be told apart from the host's own events even when the host supplies its own `cioClient`.
 *
 * Everything else (identity, segments, test cells, service URL, request queue, listeners) is still
 * read from the host's tracker when an event is sent, so later `setClientOptions` calls apply, and
 * so does an options object the host replaces. The host's own calls on its tracker keep its tag.
 *
 * Relies on the JS client reading `this.options.version` at send time. This runs on a page we do
 * not own, so it never throws where the host's tracker would not: options that cannot be tagged
 * (missing, frozen) are sent as they are, and a call that fails on the tagged tracker is retried
 * on the host's, untagged.
 */
export function withLibraryTag<T extends object>(tracker: T): T {
  const readOptions = () => (tracker as { options?: unknown }).options;
  const initial = readOptions();
  if (!canTag(initial) || initial.version === LIBRARY_TAG) return tracker;

  const taggedByOptions = new WeakMap<Options, Options>();
  const currentOptions = () => {
    const options = readOptions();
    if (isLocked(tracker, 'options') || !canTag(options) || options.version === LIBRARY_TAG) {
      return options;
    }
    let tagged = taggedByOptions.get(options);
    if (!tagged) {
      tagged = tagOptions(options);
      taggedByOptions.set(options, tagged);
    }
    return tagged;
  };

  const wrappedMethods = new WeakMap<Method, Method>();
  const wrapper: T = new Proxy(tracker, {
    get: (target, key) => {
      if (key === 'options') return currentOptions();
      const value = Reflect.get(target, key);
      if (typeof value !== 'function' || isLocked(target, key)) return value;

      const method = value as Method;
      let wrapped = wrappedMethods.get(method);
      if (!wrapped) {
        wrapped = (...args) => {
          try {
            return method.apply(wrapper, args);
          } catch {
            return method.apply(target, args);
          }
        };
        wrappedMethods.set(method, wrapped);
      }
      return wrapped;
    },
  });

  return wrapper;
}
