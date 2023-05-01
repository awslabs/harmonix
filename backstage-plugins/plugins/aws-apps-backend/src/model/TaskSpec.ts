// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { EntityMeta, UserEntity } from '@backstage/catalog-model';
import type { JsonObject, JsonValue } from '@backstage/types';

/**
 * Information about a template that is stored on a task specification.
 * Includes a stringified entityRef, and the baseUrl which is usually the relative path of the template definition
 *
 * @public
 */
export type TemplateInfo = {
  /**
   * The entityRef of the template
   */
  entityRef: string;
  /**
   * Where the template is stored, so we can resolve relative paths for things like `fetch:template` paths.
   */
  baseUrl?: string;

  /**
   * the Template entity
   */
  entity?: {
    /**
     * The metadata of the Template
     */
    metadata: EntityMeta;
  };
};

/**
 * An individual step of a scaffolder task, as stored in the database.
 *
 * @public
 */
export interface TaskStep {
  /**
   * A unique identifier for this step.
   */
  id: string;
  /**
   * A display name to show the user.
   */
  name: string;
  /**
   * The underlying action ID that will be called as part of running this step.
   */
  action: string;
  /**
   * Additional data that will be passed to the action.
   */
  input?: JsonObject;
  /**
   * When this is false, or if the templated value string evaluates to something that is falsy the step will be skipped.
   */
  if?: string | boolean;
}

/**
 * A scaffolder task as stored in the database, generated from a v1beta3
 * apiVersion Template.
 *
 * @public
 */
export interface TaskSpecV1beta3 {
  /**
   * The apiVersion string of the TaskSpec.
   */
  apiVersion: 'scaffolder.backstage.io/v1beta3';
  /**
   * This is a JSONSchema which is used to render a form in the frontend
   * to collect user input and validate it against that schema. This can then be used in the `steps` part below to template
   * variables passed from the user into each action in the template.
   */
  parameters: JsonObject;
  /**
   * A list of steps to be executed in sequence which are defined by the template. These steps are a list of the underlying
   * javascript action and some optional input parameters that may or may not have been collected from the end user.
   */
  steps: TaskStep[];
  /**
   * The output is an object where template authors can pull out information from template actions and return them in a known standard way.
   */
  output: { [name: string]: JsonValue };
  /**
   * Some information about the template that is stored on the task spec.
   */
  templateInfo?: TemplateInfo;
  /**
   * Some decoration of the author of the task that should be available in the context
   */
  user?: {
    /**
     * The decorated entity from the Catalog
     */
    entity?: UserEntity;
    /**
     * An entity ref for the author of the task
     */
    ref?: string;
  };
}

/**
 * A scaffolder task as stored in the database, generated from a Template.
 *
 * @public
 */
export type TaskSpec = TaskSpecV1beta3;
