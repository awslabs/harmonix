// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import fs from 'fs-extra';
import yaml from 'yaml';

const ID = 'harmonix:fs:write'

const examples = [
    {
        description: 'Write to a file',
        example: yaml.stringify({
            steps: [
                {
                    action: ID,
                    id: 'writeToFile',
                    name: 'Write to File',
                    input: {
                        path: './myFile.txt',
                        content: "hello world!"
                    },
                },
            ],
        }),
    },
];

export function createWriteFileAction() {

    return createTemplateAction({
        id: ID,
        description: 'Writes supplied content to a file at the specified location',
        supportsDryRun: true,
        examples,
        schema: {
            input: {
                path: d => d.string().describe('The relative path to the file to be created'),
                content: d => d.string().describe('The file contents to write'),
                formatJsonContent: d => d.boolean().default(false).describe('Whether or not to prettify JSON content'),
            },
            output: {
                path: d => d.string().describe('Path of the file that was created'),
            }
        },
        handler: async ctx => {

            const destFilepath = resolveSafeChildPath(
                ctx.workspacePath,
                ctx.input.path,
            );
            let formattedContent = ctx.input.content;
            if (ctx.input.formatJsonContent) {
                try {
                    const parsedContent = JSON.parse(ctx.input.content);
                    formattedContent = JSON.stringify(parsedContent, null, 2);
                } catch (error: unknown) {
                    // Content is not JSON, no need to format
                    if (error instanceof Error) {
                        ctx.logger.error('Failed to format file contents. Only parsable JSON content can be used with the "formatJsonContent" flag enabled.', error);
                    } else {
                        ctx.logger.warn('Failed to format file contents. Only parsable JSON content can be used with the "formatJsonContent" flag enabled.');
                    }

                }
            }

            fs.outputFileSync(destFilepath, formattedContent);

            ctx.output('path', destFilepath);
        },
    });

}