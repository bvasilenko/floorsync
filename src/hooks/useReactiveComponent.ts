import { useEffect, useRef, useCallback } from 'react';
import { Observable, Subscription } from 'rxjs';

/* Subscription management - prevents zombie subscriptions */
class Unsubscriber {
  private subscriptions: Subscription[] = [];

  add(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}

class UnsubscriberFactory {
  new(): Unsubscriber {
    return new Unsubscriber();
  }
}

export const useReactiveComponent = () => {
  const unsubscriberRef = useRef<Unsubscriber | null>(null);
  const unsubscriberFactoryRef = useRef(new UnsubscriberFactory());

  if (!unsubscriberRef.current) {
    unsubscriberRef.current = unsubscriberFactoryRef.current.new();
  }

  /* Stable when function using useCallback to prevent infinite loops */
  const when = useCallback(<T>(observable: Observable<T>, handler: (next: T) => void) => {
    const subscription = observable.subscribe(value => {
      handler(value);
    });

    unsubscriberRef.current!.add(subscription);
  }, []); // Empty deps - stable reference

  useEffect(() => {
    return () => {
      unsubscriberRef.current?.unsubscribeAll();
    };
  }, []);

  return { when };
};
