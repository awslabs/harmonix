import React, { ReactNode } from 'react';
import { AsyncAwsAppProvider, useAwsAppFromContext } from '../../hooks/useAwsApp'

interface AwsAppPageProps {
  children?: ReactNode
}

/** @public */
export function AwsAppPage({children}: AwsAppPageProps) {
  return (
    <AsyncAwsAppProvider {...useAwsAppFromContext()}>
      {children}
    </AsyncAwsAppProvider>
  );
}
