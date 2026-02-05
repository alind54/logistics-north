/**
 * Server-Sent Events (SSE) event bus for real-time updates.
 * Clients subscribe, and any server-side action can broadcast events.
 */

type EventCallback = (data: string) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    return () => {
      const set = this.listeners.get(channel);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, event: { type: string; payload: unknown }) {
    const set = this.listeners.get(channel);
    if (set) {
      const data = JSON.stringify(event);
      for (const cb of set) {
        cb(data);
      }
    }
  }

  get subscriberCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }
}

// Singleton event bus (works within a single server process)
export const eventBus = new EventBus();

// Channel names
export const BOARD_CHANNEL = 'board';
export const NOTIFICATIONS_CHANNEL_PREFIX = 'notifications:';
