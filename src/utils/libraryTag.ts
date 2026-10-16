import version from '../version';

/** The client tag (`c`) on this library's tracking events. */
export const LIBRARY_TAG = `cio-ui-asa-${version}`;

/**
 * The given tracker, but events sent through it carry LIBRARY_TAG as their client tag, so they can
 * be told apart from the host's own events even when the host supplies its own `cioClient`.
 *
 * Everything else (identity, segments, test cells, service URL, request queue, listeners) is still
 * read from the host's tracker when an event is sent, so later `setClientOptions` calls apply.
 * The host's own calls on its tracker keep its tag.
 *
 * Relies on the JS client reading `this.options.version` at send time. A tracker without a plain
 * options object is returned unchanged.
 */
export function withLibraryTag<T extends object>(tracker: T): T {
  const { options } = tracker as { options?: Record<PropertyKey, unknown> };
  if (!options || typeof options !== 'object' || !Object.isExtensible(options)) return tracker;
  if (options.version === LIBRARY_TAG) return tracker;

  const taggedOptions = new Proxy(options, {
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

  // Methods, `requests` and `eventemitter` come from the host's tracker through the prototype.
  return Object.create(tracker, { options: { value: taggedOptions } });
}
