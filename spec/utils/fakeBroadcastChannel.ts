/** In-memory `BroadcastChannel`: a message reaches every other open channel of the same name. */
export default class FakeBroadcastChannel {
  static open = new Set<FakeBroadcastChannel>();

  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.open.add(this);
  }

  postMessage(data: unknown) {
    FakeBroadcastChannel.open.forEach((channel) => {
      if (channel !== this && channel.name === this.name) {
        channel.onmessage?.({ data } as MessageEvent);
      }
    });
  }

  close() {
    FakeBroadcastChannel.open.delete(this);
  }
}
