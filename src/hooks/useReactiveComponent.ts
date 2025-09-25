import { useEffect, useRef, useReducer, useCallback } from 'react';
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

/* React hook implementing Angular's BaseComponent pattern */
export const useReactiveComponent = () => {
  const unsubscriberRef = useRef<Unsubscriber | null>(null);
  const unsubscriberFactoryRef = useRef(new UnsubscriberFactory());

  /* Force re-render capability similar to Angular's detectChanges */
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  if (!unsubscriberRef.current) {
    unsubscriberRef.current = unsubscriberFactoryRef.current.new();
  }

  /* Stable when function using useCallback to prevent infinite loops */
  const when = useCallback(<T>(observable: Observable<T>, handler: (next: T) => void) => {
    const subscription = observable.subscribe(value => {
      handler(value);
      /* Trigger re-render after handling observable emission */
      forceUpdate();
    });

    unsubscriberRef.current!.add(subscription);
  }, []); // Empty deps - stable reference

  /* Manual change detection */
  const detectChanges = useCallback(() => {
    forceUpdate();
  }, []);

  /* Cleanup all subscriptions when component unmounts */
  useEffect(() => {
    return () => {
      unsubscriberRef.current?.unsubscribeAll();
    };
  }, []);

  return { when, detectChanges };
};
