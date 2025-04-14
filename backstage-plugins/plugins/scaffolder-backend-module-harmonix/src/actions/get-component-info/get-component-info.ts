// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { kebabCase } from 'lodash';
import { stringify } from 'yaml';

const ID = 'harmonix:get-component-info';

const examples = [
  {
    description: 'Sets useful component info for other actions to use',
    example: stringify({
      steps: [
        {
          action: ID,
          id: 'getComponentInfo',
          name: 'Get Component Info',
          input: {
            componentName: 'myComponent',
          },
        },
      ],
    }),
  },
];

export function getComponentInfoAction() {

  return createTemplateAction({
    id: ID,
    description: 'Sets useful component info for other actions to use',
    supportsDryRun: true,
    examples,
    schema: {
      input: {
        componentName: d => d.string().describe('The name of the component'),
      },
      output: {
        kebabCaseComponentName: d => d.string().describe('The component name, converted to kebab case'),
      }
    },
    handler: async ctx => {

      // Note: no special handling is needed for dry runs

      const { componentName, } = ctx.input;

      const kebabComponentName = kebabCase(componentName);

      ctx.logger.info(`Kebab case component name: ${kebabComponentName}`);
      ctx.output('kebabCaseComponentName', kebabComponentName);
    },
  });

}
