// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InputError } from '@backstage/errors';
import { ScmIntegrationRegistry } from '@backstage/integration';

export type RepoSpec = {
  repo: string;
  host: string;
  owner?: string;
  organization?: string;
  workspace?: string;
  project?: string;
};

export const parseRepoUrl = (repoUrl: string, integrations: ScmIntegrationRegistry): RepoSpec => {
  let parsed;
  try {
    parsed = new URL(`https://${repoUrl}`);
  } catch (error) {
    throw new InputError(`Invalid repo URL passed to publisher, got ${repoUrl}, ${error}`);
  }
  const host = parsed.host;
  const owner = parsed.searchParams.get('owner') ?? undefined;
  const organization = parsed.searchParams.get('organization') ?? undefined;
  const workspace = parsed.searchParams.get('workspace') ?? undefined;
  const project = parsed.searchParams.get('project') ?? undefined;

  const type = integrations.byHost(host)?.type;

  if (!type) {
    throw new InputError(
      `No matching integration configuration for host ${host}, please check your integrations config`,
    );
  }

  const repo: string = parsed.searchParams.get('repo')!;
  switch (type) {
    case 'bitbucket': {
      if (host === 'www.bitbucket.org') {
        checkRequiredParams(parsed, 'workspace');
      }
      checkRequiredParams(parsed, 'project', 'repo');
      break;
    }
    case 'gitlab': {
      // project is the projectID, and if defined, owner and repo won't be needed.
      if (!project) {
        checkRequiredParams(parsed, 'owner', 'repo');
      }
      break;
    }
    case 'gerrit': {
      checkRequiredParams(parsed, 'repo');
      break;
    }
    default: {
      checkRequiredParams(parsed, 'repo', 'owner');
      break;
    }
  }

  return { host, owner, repo, organization, workspace, project };
};

/**
 * This function checks if the required parameters (given as the `params` argument) are present in the URL
 *
 * @param repoUrl - the URL for the repository
 * @param params - a variadic list of URL query parameter names
 *
 * @throws
 * An InputError exception is thrown if any of the required parameters is not in the URL.
 *
 * @public
 */
function checkRequiredParams(repoUrl: URL, ...params: string[]) {
  for (let param of params) {
    if (!repoUrl.searchParams.get(param)) {
      throw new InputError(`Invalid repo URL passed to publisher: ${repoUrl.toString()}, missing ${param}`);
    }
  }
}
