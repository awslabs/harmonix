// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { kebabCase } from 'lodash';
import { stringify } from 'yaml';

const ID = 'opa:get-component-info';

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
  return createTemplateAction<{
    componentName: string;
  }>({
    id: ID,
    description: 'Sets useful component info for other actions to use',
    examples,
    schema: {
      input: {
        type: 'object',
        required: ['componentName'],
        properties: {
          componentName: {
            title: 'Component Name',
            description: 'The name of the component',
            type: 'string',
          },
        },
      },
      output: {
        type: 'object',
        required: [
          'kebabCaseComponentName',
        ],
        properties: {
          kebabCaseComponentName: {
            title: 'The component name, converted to kebab case',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const { componentName, } = ctx.input;

      const kebabComponentName = kebabCase(componentName);

      ctx.logger.info(`Kebab case component name: ${kebabComponentName}`);
      ctx.output('kebabCaseComponentName', kebabComponentName);
    },
  });
}
