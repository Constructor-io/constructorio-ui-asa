import type { ConstructorIOClient } from '../../../types';

type StreamEvent = { type: string; data: Record<string, unknown> };

const PRODUCT_IMAGE =
  'https://constructorio-integrations.s3.amazonaws.com/tikus-threads/2022-06-29/PANT_ACTIVE-PANT_GWB00623SBL770_1_category.jpg';

const product = (id: string, value: string, price: number) => ({
  value,
  data: { id, image_url: PRODUCT_IMAGE, price, url: '#' },
});

function scriptedTurn(intent: string): StreamEvent[] {
  return [
    { type: 'start', data: { thread_id: 'story-thread', intent_result_id: `ir-${intent}` } },
    { type: 'message', data: { text: `Here are a few picks for "${intent}".` } },
    { type: 'group', data: { display_name: 'Popular right now', value: intent } },
    {
      type: 'search_result',
      data: {
        result_id: `sr-${intent}`,
        response: {
          results: [
            product('1', 'Ultraboost Light Running Shoes', 190),
            product('2', 'Runfalcon Running Shoes', 134),
            product('3', 'Supernova Rise', 140),
          ],
        },
      },
    },
    {
      type: 'follow_up_refinement',
      data: {
        question: 'Who are you shopping for?',
        options: ["Women's styles", "Men's styles", 'Kids and baby', 'Mix and match'],
      },
    },
  ];
}

function createEventStream(events: StreamEvent[], delayMs: number): ReadableStream<StreamEvent> {
  let index = 0;
  return new ReadableStream<StreamEvent>({
    pull(controller) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (index < events.length) {
            controller.enqueue(events[index]);
            index += 1;
          } else {
            controller.close();
          }
          resolve();
        }, delayMs);
      });
    },
  });
}

/** Offline stand-in for the JS client: every turn replays a scripted stream ending in a refinement. */
export default function createMockAgentClient({ delayMs = 150 }: { delayMs?: number } = {}) {
  const noop = () => {};
  return {
    agent: {
      getAgentResultsStream: (intent: string) => createEventStream(scriptedTurn(intent), delayMs),
    },
    tracker: {
      trackAssistantSubmit: noop,
      trackAssistantResultLoadStarted: noop,
      trackAssistantResultLoadFinished: noop,
      trackAssistantResultClick: noop,
      trackAssistantResultView: noop,
      trackAssistantSearchSubmit: noop,
    },
  } as unknown as ConstructorIOClient;
}
