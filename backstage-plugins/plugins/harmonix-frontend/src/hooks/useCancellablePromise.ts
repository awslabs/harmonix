// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useRef, useEffect } from "react";

type CancellablePromise = {
  promise: Promise<any>;
  cancel: VoidFunction;
}

/**
 * Wraps a promise so that it is cancellable. Rejects promise when cancellation
 * occurs.
 * 
 * Example use:
 * try { // invoke code that returns a cancellable promise } 
 * catch (e) {
 *   if ((e as any).isCanceled) {
 *     // handle cancellation
 *   } else {
 *    // handle regular promise error
 *   }
 * }
 *
 * @param promise - The promise to wrap
 * @returns The wrapped promise and a function to cancel it
 */
export function makeCancellableWithErrors(promise: Promise<any>): {
  promise: Promise<unknown>;
  cancel(): void;
} {
  let isCanceled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then((val) => (isCanceled ? reject({ isCanceled }) : resolve(val)))
      .catch((error) => (isCanceled ? reject({ isCanceled }) : reject(error)));
  });

  return {
    promise: wrappedPromise,
    cancel() {
      isCanceled = true;
    }
  };
}

/**
 * Wraps a promise so that it is cancellable. Suppresses errors and does not
 * reject the promise when cancellation occurs.
 *
 * @param promise - The promise to wrap
 * @returns The wrapped promise and a function to cancel it
 */
export function makeCancellable(promise: Promise<any>): {
  promise: Promise<unknown>;
  cancel(): void;
} {
  let isCanceled = false;
  const wrappedPromise =
    new Promise((resolve, reject) => {
      // Suppress resolution and rejection if canceled
      promise
        .then((val) => (!isCanceled && resolve(val)))
        .catch((error) => (!isCanceled && reject(error)));
    });
  return {
    promise: wrappedPromise,
    cancel() {
      isCanceled = true;
    },
  };
}

/**
 * Returns a function that wraps a promise so that it is canceled automatically
 * when the component unmounts. 
 * 
 * @param options - Optional. Allows control of whether promise is rejected when
 * cancellation occurs. Defaults to false.
 * @returns a function that wraps a promise so that it is canceled automatically
 * when the component unmounts. 
 */
export function useCancellablePromise({ rejectOnCancel = false }): {
  cancellablePromise: <T>(p: Promise<T>) => Promise<T>;
} {
  const cancellable = rejectOnCancel ? makeCancellableWithErrors : makeCancellable;
  const emptyPromise = Promise.resolve(true);

  // test if the input argument is a cancelable promise generator
  if (cancellable(emptyPromise).cancel === undefined) {
    throw new Error(
      "promise wrapper argument must provide a cancel() function"
    );
  }

  const promises = useRef<any[]>();

  useEffect(() => {
    promises.current = promises.current || [];
    return function cancel() {
      promises.current!.forEach((p: CancellablePromise) => p.cancel());
      promises.current = [];
    };
  }, []);

  function cancellablePromise<T>(p: Promise<T>): Promise<T> {
    const cPromise = cancellable(p);
    promises.current!.push(cPromise);
    return cPromise.promise as Promise<T>;
  }

  return { cancellablePromise };
}
