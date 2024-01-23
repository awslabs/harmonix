// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CloudFormationClient, DeleteStackCommand, DeleteStackCommandOutput } from '@aws-sdk/client-cloudformation';
import {
  DeleteSecretCommand,
  DeleteSecretCommandInput,
  DeleteSecretCommandOutput,
  GetSecretValueCommand,
  GetSecretValueCommandInput,
  GetSecretValueCommandOutput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import {
  GetParameterCommand,
  GetParameterCommandInput,
  GetParameterCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import {
  AWSEnvironmentProviderRecord,
  AppPromoParams,
  BindResourceParams,
  GitRepoParams,
} from '@aws/plugin-aws-apps-common-for-backstage';
import { Logger } from 'winston';
import YAML from 'yaml';

export type GitLabDownloadFileResponse = {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  execute_filemode: boolean;
};

export class AwsAppsPlatformApi {
  public constructor(
    private readonly logger: Logger,
    private readonly platformRegion: string,
    private readonly awsRegion: string,
    private readonly awsAccount: string,
  ) {
    this.logger.info('Instantiating AWS Apps Platform API with:');
    this.logger.info(`platformRegion: ${this.platformRegion}`);
    this.logger.info(`awsAccount: ${this.awsAccount}`);
    this.logger.info(`awsRegion: ${this.awsRegion}`);
  }

  /**
   * Get SecretsManager Secret value.
   *
   * @remarks
   * Get SecretsManager Secret value.
   *
   * @param secretArn - The Arn or name of the secret to retrieve
   * @returns The GetSecretValueCommandOutput object
   *
   */
  public async getPlatformSecretValue(secretArn: string): Promise<GetSecretValueCommandOutput> {
    this.logger.info(`Calling getPlatformSecretValue for ${secretArn} against platform region ${this.platformRegion}`);

    const client = new SecretsManagerClient({
      region: this.platformRegion,
    });
    const params: GetSecretValueCommandInput = {
      SecretId: secretArn,
    };
    const command = new GetSecretValueCommand(params);
    const resp = client.send(command);
    return resp;
  }

  /**
   * Get SSM Parameter Store value.
   *
   * @remarks
   * Get SSM Parameter Store value.
   *
   * @param ssmKey - The SSM param key to retrieve
   * @returns The GetParameterCommandOutput object
   *
   */
  public async getSsmValue(ssmKey: string): Promise<GetParameterCommandOutput> {
    this.logger.info(`Calling getSsmValue for ${ssmKey} against platform region ${this.platformRegion}`);
    const client = new SSMClient({
      region: this.platformRegion,
    });

    const params: GetParameterCommandInput = {
      Name: ssmKey,
      WithDecryption: true,
    };
    const command = new GetParameterCommand(params);
    const resp = client.send(command);
    return resp;
  }

  public async deletePlatformSecret(secretName: string): Promise<DeleteSecretCommandOutput> {
    this.logger.info(`Calling deletePlatformSecret for ${secretName} against platform region ${this.platformRegion}`);
    const client = new SecretsManagerClient({
      region: this.platformRegion,
    });

    const params: DeleteSecretCommandInput = {
      SecretId: secretName,
      ForceDeleteWithoutRecovery: true,
    };
    const command = new DeleteSecretCommand(params);
    const resp = client.send(command);
    return resp;
  }

  public async deleteCFStack(stackName: string, accessRole: string): Promise<DeleteStackCommandOutput> {
    this.logger.info('Calling deleteProvider');
    const stsClient = new STSClient({ region: this.awsRegion });
    //console.log(`deleting ${stackName}`)
    const stsResult = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: accessRole,
        RoleSessionName: `cf-stack-deletion-backstage-session`,
        DurationSeconds: 3600, // max is 1 hour for chained assumed roles
      }),
    );
    if (stsResult.Credentials) {
      //console.log(stsResult.Credentials)
      const client = new CloudFormationClient({
        region: this.awsRegion,
        credentials: {
          accessKeyId: stsResult.Credentials.AccessKeyId!,
          secretAccessKey: stsResult.Credentials.SecretAccessKey!,
          sessionToken: stsResult.Credentials.SessionToken,
        },
      });

      const input = {
        StackName: stackName,
      };
      const command = new DeleteStackCommand(input);
      const response = client.send(command);
      return response;
    } else {
      throw new Error("can't fetch credentials to remove requested provider");
    }
  }

  public async deleteTFProvider(
    envName: string,
    providerName: string,
    gitHost: string,
    gitProjectGroup: string,
    gitRepoName: string,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    let gitProjectId: string;
    gitProjectId = await this.getGitProjectId(gitHost, gitProjectGroup, gitRepoName, gitToken);
    console.log(`Got GitLab project ID: ${gitProjectId} for ${gitProjectGroup}/${gitRepoName}`);
    let actions = [];
    const tfDeleteContent = `PROVIDER_FILE_TO_DELETE=${envName}-${providerName}.properties\nENV_ENTITY_REF="awsenvironment:default/${envName}"\nTARGET_ENV_NAME=${envName}\nTARGET_ENV_PROVIDER_NAME=${providerName}`;
    const tfDeleteFile = `.awsdeployment/env-destroy-params-temp.properties`;
    actions.push({
      action: 'create',
      file_path: tfDeleteFile,
      content: tfDeleteContent,
    });
    const commit = {
      branch: 'main',
      commit_message: `Destroy TF Infrastructure`,
      actions: actions,
    };

    const url = `https://${gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
    const result = await fetch(new URL(url), {
      method: 'POST',
      body: JSON.stringify(commit),
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(`ERROR: Failed to Destroy ${envName}. Response code: ${result.status} - ${resultBody}`);
      let message = '';
      if (resultBody.message?.includes('A file with this name already exists')) {
        message = `${envName} has already been scheduled for destruction. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = resultBody.message || '';
      }
      return { status: 'FAILURE', message };
    } else {
      return {
        status: 'SUCCESS',
        message: `Destroy will not be complete until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`,
      };
    }
  }

  public async deleteRepository(
    gitHost: string,
    gitProjectGroup: string,
    gitRepoName: string,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    let gitProjectId: string;
    gitProjectId = await this.getGitProjectId(gitHost, gitProjectGroup, gitRepoName, gitToken);
    console.log(`Got GitLab project ID: ${gitProjectId} for ${gitProjectGroup}/${gitRepoName}`);

    // now delete the repo
    const url = `https://${gitHost}/api/v4/projects/${gitProjectId}`;
    console.log(url);
    const deleteRepoResults = await fetch(url, {
      method: 'DELETE',
      headers: {
        'PRIVATE-TOKEN': gitToken,
      },
    });
    console.log(deleteRepoResults);
    if (deleteRepoResults.status > 299) {
      return { status: 'FAILURE', message: `Repository failed to delete` };
    } else {
      return { status: 'SUCCESS', message: `Repository deleted successfully` };
    }
  }

  private async getGitToken(gitSecretName: string): Promise<string> {
    const gitAdminSecret = await this.getPlatformSecretValue(gitSecretName);
    const gitAdminSecretObj = JSON.parse(gitAdminSecret.SecretString || '');
    return gitAdminSecretObj['apiToken'];
  }

  private async getGitProjectId(
    gitHost: string,
    gitProjectGroup: string,
    gitRepoName: string,
    gitToken: string,
  ): Promise<string> {
    const gitProjects = await fetch(`https://${gitHost}/api/v4/projects?search=${gitRepoName}`, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const gitProjectsJson: { path_with_namespace: string; id: string }[] = await gitProjects.json();
    let project = null;
    if (gitProjectsJson) {
      project = gitProjectsJson.filter(
        project => project.path_with_namespace === `${gitProjectGroup}/${gitRepoName}`,
      )[0];
    }

    if (project && project.id) {
      return project.id;
    } else {
      throw new Error(`Failed to get git project ID for group '${gitProjectGroup}' and repo '${gitRepoName}'`);
    }
  }

  public async getFileContentsFromGit(
    repo: GitRepoParams,
    filePath: string,
    gitSecretName: string,
  ): Promise<GitLabDownloadFileResponse> {
    const gitToken = await this.getGitToken(gitSecretName);

    let gitProjectId: string;
    gitProjectId = await this.getGitProjectId(repo.gitHost, repo.gitProjectGroup, repo.gitRepoName, gitToken);
    console.log(`Got GitLab project ID: ${gitProjectId} for ${repo.gitProjectGroup}/${repo.gitRepoName}`);

    const url = `https://${repo.gitHost}/api/v4/projects/${gitProjectId}/repository/files/${filePath}?ref=main`;
    const result = await fetch(new URL(url), {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(
        `ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status} - ${resultBody}`,
      );
      throw new Error(`Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status}`);
    } else {
      return resultBody;
    }
  }

  public async promoteAppToGit(
    input: AppPromoParams,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    // Hardcoded responses for developer testing
    // return {status: "SUCCESS", message: `Promotion will not be complete until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`};
    // return {status: "FAILURE", message: "Some error description"};

    let gitProjectId: string;
    try {
      gitProjectId = await this.getGitProjectId(input.gitHost, input.gitProjectGroup, input.gitRepoName, gitToken);
      console.log(`Got GitLab project ID: ${gitProjectId} for ${input.gitProjectGroup}/${input.gitRepoName}`);
    } catch (err: any) {
      console.error(`ERROR: ${err.toString()}`);
      return { status: 'FAILURE', message: `Failed to retrieve Git project ID for ${input.gitRepoName}` };
    }

    // Now build a new commit that will trigger the pipeline
    const actions = await Promise.all(
      input.providers.map(async provider => {
        const propsFile = `.awsdeployment/providers/${input.envName}-${provider.providerName}.properties`;

        let propsContent =
          `ACCOUNT=${provider.awsAccount}\nREGION=${provider.awsRegion}\nTARGET_ENV_NAME=${provider.environmentName}\nPREFIX=${provider.prefix}\n` +
          `TARGET_ENV_PROVIDER_NAME=${provider.providerName}\nOPA_CI_ENVIRONMENT=${provider.environmentName}-${provider.providerName}\n` +
          `OPA_CI_ENVIRONMENT_MANUAL_APPROVAL=${input.envRequiresManualApproval}\n` +
          `OPA_CI_REGISTRY_IMAGE=${provider.awsAccount}.dkr.ecr.${provider.awsRegion}.amazonaws.com/${input.appName}-${input.envName}-${provider.providerName}\n` +
          `OPA_CI_REGISTRY=${provider.awsAccount}.dkr.ecr.${provider.awsRegion}.amazonaws.com\n`;

        Object.keys(provider.parameters).forEach(key => {
          propsContent += `${key}=${provider.parameters[key]}\n`;
        });

        return {
          action: 'create',
          file_path: propsFile,
          content: propsContent,
        };
      }),
    );

    const commit = {
      branch: 'main',
      commit_message: 'generate CICD stages',
      actions: actions,
    };

    const url = `https://${input.gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
    const result = await fetch(new URL(url), {
      method: 'POST',
      body: JSON.stringify(commit),
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(
        `ERROR: Failed to schedule deployment for ${input.envName}. Response code: ${result.status} - ${resultBody}`,
      );
      let message = '';
      if (resultBody.message?.includes('A file with this name already exists')) {
        message = `${input.envName} has already been scheduled for deployment. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = resultBody.message || '';
      }
      return { status: 'FAILURE', message };
    } else {
      return {
        status: 'SUCCESS',
        message: `The app will not be ready to run until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`,
      };
    }
  }

  public async bindResource(
    input: BindResourceParams,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    let gitProjectId: string;
    gitProjectId = await this.getGitProjectId(input.gitHost, input.gitProjectGroup, input.gitRepoName, gitToken);
    console.log(`Got GitLab project ID: ${gitProjectId} for ${input.gitProjectGroup}/${input.gitRepoName}`);

    const actions = input.policies.map(p => {
      const policyFile = `.iac/permissions/${input.envName}/${input.providerName}/${p.policyFileName}.json`;
      const policyContent = p.policyContent;

      return {
        action: 'create',
        file_path: policyFile,
        content: policyContent,
      };
    });

    const resourceBindContent = `RESOURCE_ENTITY_REF=${input.resourceEntityRef}\nRESOURCE_ENTITY=${input.resourceName}\nTARGET_ENV_NAME=${input.envName}\nTARGET_ENV_PROVIDER_NAME=${input.providerName}`;
    const resourceBindFile = `.awsdeployment/resource-binding-params-temp.properties`;
    actions.push({
      action: 'create',
      file_path: resourceBindFile,
      content: resourceBindContent,
    });

    const commit = {
      branch: 'main',
      commit_message: `Bind Resource`,
      actions: actions,
    };

    const url = `https://${input.gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
    const result = await fetch(new URL(url), {
      method: 'POST',
      body: JSON.stringify(commit),
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(`ERROR: Failed to bind ${input.envName}. Response code: ${result.status} - ${resultBody}`);
      let message = '';
      if (resultBody.message?.includes('A file with this name already exists')) {
        message = `${input.envName} has already been scheduled for binding. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = resultBody.message || '';
      }
      return { status: 'FAILURE', message };
    } else {
      return {
        status: 'SUCCESS',
        message: `Binding will not be complete until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`,
      };
    }
  }

  public async unBindResource(
    input: BindResourceParams,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    let gitProjectId: string;
    gitProjectId = await this.getGitProjectId(input.gitHost, input.gitProjectGroup, input.gitRepoName, gitToken);
    console.log(`Got GitLab project ID: ${gitProjectId} for ${input.gitProjectGroup}/${input.gitRepoName}`);

    const actions = input.policies.map(p => {
      const policyFile = `.iac/permissions/${input.envName}/${input.providerName}/${p.policyFileName}.json`;
      const policyContent = p.policyContent;

      return {
        action: 'delete',
        file_path: policyFile,
        content: policyContent,
      };
    });

    const resourceBindContent = `RESOURCE_ENTITY_REF=${input.resourceEntityRef}\nRESOURCE_ENTITY=${input.resourceName}\nTARGET_ENV_NAME=${input.envName}\nTARGET_ENV_PROVIDER_NAME=${input.providerName}`;
    const resourceBindFile = `.awsdeployment/resource-binding-params-temp.properties`;
    actions.push({
      action: 'create',
      file_path: resourceBindFile,
      content: resourceBindContent,
    });

    const commit = {
      branch: 'main',
      commit_message: `UnBind Resource`,
      actions: actions,
    };

    const url = `https://${input.gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
    const result = await fetch(new URL(url), {
      method: 'POST',
      body: JSON.stringify(commit),
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(`ERROR: Failed to unbind ${input.envName}. Response code: ${result.status} - ${resultBody}`);
      let message = '';
      if (resultBody.message?.includes('A file with this name already exists')) {
        message = `${input.envName} has already been scheduled for unbinding. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = resultBody.message || '';
      }
      return { status: 'FAILURE', message };
    } else {
      return {
        status: 'SUCCESS',
        message: `Unbinding will not be complete until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`,
      };
    }
  }

  public async updateProvider(
    envName: string,
    provider: AWSEnvironmentProviderRecord,
    gitHost: string,
    gitProjectGroup: string,
    gitRepoName: string,
    entityCatalog: any,
    action: string,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitAdminSecret = await this.getPlatformSecretValue(gitSecretName);
    const gitAdminSecretObj = JSON.parse(gitAdminSecret.SecretString || '');
    const gitToken = gitAdminSecretObj['apiToken'];

    // fetch project ID
    let gitProjectId: string;
    try {
      gitProjectId = await this.getGitProjectId(gitHost, gitProjectGroup, gitRepoName, gitToken);
      console.log(`Got GitLab project ID: ${gitProjectId} for ${gitProjectGroup}/${gitRepoName}`);
    } catch (err: any) {
      console.error(`ERROR: ${err.toString()}`);
      return { status: 'FAILURE', message: `Failed to retrieve Git project ID for ${gitRepoName}` };
    }
    let actions = [];
    if (action === 'add') {
      console.log(entityCatalog);
      const newDependencies = entityCatalog.spec.dependsOn as Array<string>;
      newDependencies.push(`awsenvironmentprovider:default/${provider.name.toLowerCase()}`);
      entityCatalog.spec.dependsOn = newDependencies;
      const providerContent = YAML.stringify(entityCatalog);
      console.log(providerContent);
      const providerFile = `.backstage/catalog-info.yaml`;
      actions.push({
        action: 'update',
        file_path: providerFile,
        content: providerContent,
      });
    } else if (action === 'remove') {
      console.log(entityCatalog);
      const dependencies = entityCatalog.spec.dependsOn as Array<string>;
      let newDependencies = Array<string>();
      dependencies.forEach(p => {
        const providerToRemove = `awsenvironmentprovider:default/${provider.name.toLowerCase()}`;
        if (p != providerToRemove) {
          newDependencies.push(p);
        }
      });
      entityCatalog.spec.dependsOn = newDependencies;
      const providerContent = YAML.stringify(entityCatalog);
      console.log(providerContent);
      const providerFile = `.backstage/catalog-info.yaml`;
      actions.push({
        action: 'update',
        file_path: providerFile,
        content: providerContent,
      });
    } else {
      throw new Error('Not yet implemented');
    }

    const commit = {
      branch: 'main',
      commit_message: `Update Environment Provider`,
      actions: actions,
    };

    const url = `https://${gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
    const result = await fetch(new URL(url), {
      method: 'POST',
      body: JSON.stringify(commit),
      headers: {
        'PRIVATE-TOKEN': gitToken,
        'Content-Type': 'application/json',
      },
    });

    const resultBody = await result.json();
    if (result.status > 299) {
      console.error(
        `ERROR: Failed to Update provider ${provider.name}. Response code: ${result.status} - ${resultBody}`,
      );
      let message = '';
      if (resultBody.message?.includes('A file with this name already exists')) {
        message = `Update ${provider.name} has already been scheduled. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = resultBody.message || '';
      }
      return { status: 'FAILURE', message };
    } else {
      return {
        status: 'SUCCESS',
        message: `Update Provider for ${envName} will not be complete until deployment succeeds. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`,
      };
    }
  }
}
