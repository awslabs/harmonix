// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Entity,
    entityKindSchemaValidator,
    KindValidator  } from '@backstage/catalog-model';
  import { JsonObject } from '@backstage/types';
  import schema from './AWSEnvironmentEntityV1.schema.json';

  /**
   * Backstage catalog Template kind Entity. Templates are used by the Scaffolder
   * plugin to create new entities, such as Components.
   *
   * @public
   */
  export interface AWSEnvironmentEntityV1 extends Entity {
    /**
     * The apiVersion string of the TaskSpec.
     */
    apiVersion: 'aws.backstage.io/v1alpha';
    /**
     * The kind of the entity
     */
    kind: 'AWSEnvironment';
    /**
     * The specification of the Template Entity
     */
    spec: {
      /**
       * The type that the Template will create. For example service, website or library.
       */
      type: string;
      /**
       * This is a JSONSchema or an array of JSONSchema's which is used to render a form in the frontend
       * to collect user input and validate it against that schema. This can then be used in the `steps` part below to template
       * variables passed from the user into each action in the template.
       */
      parameters?: JsonObject | JsonObject[];

      system?: string;
      lifecycle: string;
      /**
       * The output is an object where template authors can pull out information from template actions and return them in a known standard way.
       */
      output?: { [name: string]: string };
      /**
       * The owner entityRef of the TemplateEntity
       */
      owner?: string;
      dependsOn?: string[];
    };
  }
  
  const validator = entityKindSchemaValidator(schema);
  
  /**
   * Entity data validator for {@link AWSEnvironmentEntityV1}.
   *
   * @public
   */
  export const awsEnvironmentEntityV1Validator: KindValidator = {
    // TODO(freben): Emulate the old KindValidator until we fix that type
    async check(data: Entity) {
      return validator(data) === data;
    },
  };

