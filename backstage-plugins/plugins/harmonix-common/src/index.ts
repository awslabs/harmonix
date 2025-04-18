/***/
/**
 * Common functionalities for the harmonix plugin.
 *
 * @packageDocumentation
 */

/**
 * In this package you might for example declare types that are common
 * between the frontend and backend plugin packages.
 */
export type CommonType = {
  field: string;
};

export * from './types';
export * from './permissions';
export * from './utils/git-util';
export * from './constants';

/**
 * Or you might declare some common constants.
 */
export const COMMON_CONSTANT = 1;

export { type AWSEnvironmentProviderEntityV1, awsEnvironmentProviderEntityV1Validator } from './entities/AWSEnvironmentProviderEntityV1';
export { type AWSEnvironmentEntityV1,awsEnvironmentEntityV1Validator } from './entities/AWSEnvironmentEntityV1';