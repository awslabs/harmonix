// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
import {
  AWSEnvironmentProviderRecord,
  AppPromoParams,
  BindResourceParams,
  GitProviders, 
  ICommitChange, 
  IGitAPIResult, 
  IRepositoryInfo
} from '@aws/plugin-aws-apps-common-for-backstage';
import YAML from 'yaml';
import { GitAPI } from './git-api';
import { LoggerService } from '@backstage/backend-plugin-api';

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
  public git: GitAPI;
   
  public constructor(
    private readonly logger: LoggerService,
    private readonly platformRegion: string,
    private readonly awsRegion: string,
    private readonly awsAccount: string,
    private readonly gitProvider: GitProviders
  ) {
    this.logger.info('Instantiating AWS Apps Platform API with:');
    this.logger.info(`platformRegion: ${this.platformRegion}`);
    this.logger.info(`awsAccount: ${this.awsAccount}`);
    this.logger.info(`awsRegion: ${this.awsRegion}`);
    this.logger.info(`gitProvider: ${this.gitProvider}`);
    this.git = new GitAPI(logger, gitProvider);
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


  public async deleteTFProvider(
    envName: string,
    providerName: string,
    repo: IRepositoryInfo,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    const tfDeleteContent = `PROVIDER_FILE_TO_DELETE=${envName}-${providerName}.properties\nENV_ENTITY_REF="awsenvironment:default/${envName}"\nTARGET_ENV_NAME=${envName}\nTARGET_ENV_PROVIDER_NAME=${providerName}`;
    let tfDeleteFile;

    if (envName==="")
    {
      tfDeleteFile = `env-destroy-params-temp.properties`;
    }
    else
    {
     tfDeleteFile = `.awsdeployment/env-destroy-params-temp.properties`;
    }

    const change:ICommitChange = {
      commitMessage: `Destroy TF Infrastructure`,
      branch: 'main',
      actions: [
        {
          action: 'create',
          file_path: tfDeleteFile,
          content: tfDeleteContent,
        }
      ]
    }

    const result = await this.git.getGitProvider().commitContent(change, repo, gitToken);

    if (!result.isSuccuess) {
      console.error(`ERROR: Failed to Destroy ${envName}. Response: ${result}`);
      let message = '';
      if (result.value?.includes('A file with this name already exists')) {
        message = `${envName} has already been scheduled for destruction. Check the CICD pipeline for the most up-to-date information. UI status may take a few minutes to update.`;
      } else {
        message = result.value || '';
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
    repo: IRepositoryInfo,
    gitSecretName: string,
  ): Promise<IGitAPIResult> {
    const gitToken = await this.getGitToken(gitSecretName);
    const result = await this.git.getGitProvider().deleteRepository(repo, gitToken);

    console.log(result);
    return result;
  }

  private async getGitToken(gitSecretName: string): Promise<string> {
    const gitAdminSecret = await this.getPlatformSecretValue(gitSecretName);
    const gitAdminSecretObj = JSON.parse(gitAdminSecret.SecretString || '');
    return gitAdminSecretObj['apiToken'];
  }

  public async getFileContentsFromGit(
    repo: IRepositoryInfo,
    filePath: string,
    gitSecretName: string,
  ): Promise<string> {
    const gitToken = await this.getGitToken(gitSecretName);

    const result = await this.git.getGitProvider().getFileContent(filePath,repo,gitToken);
  
    const resultBody = await result.value;
    if (!result.isSuccuess) {
      console.error(
        `ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response: ${result}`,
      );
      throw new Error(`Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response: ${result}`);
    } else {
      return resultBody;
    }
  }

  public async promoteAppToGit(
    input: AppPromoParams,
    repo: IRepositoryInfo,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

    // build a new commit that will trigger the pipeline
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


    const change:ICommitChange = {
      commitMessage: `generate CICD stages`,
      branch: 'main',
      actions
    }

    const result = await this.git.getGitProvider().commitContent(change, repo, gitToken);


    const resultBody = result.value;
    if (!result.isSuccuess) {
      console.error(
        `ERROR: Failed to schedule deployment for ${input.envName}. Response: ${result}`,
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
    repo: IRepositoryInfo,
    input: BindResourceParams,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

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

    const change:ICommitChange = {
      commitMessage: `Bind Resource`,
      branch: 'main',
      actions
    }

    const result = await this.git.getGitProvider().commitContent(change, repo, gitToken);
    const resultBody = result.value;
    if (!result.isSuccuess) {
      console.error(`ERROR: Failed to bind ${input.envName}. Response: ${result}`);
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
    repo: IRepositoryInfo,
    input: BindResourceParams,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

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

    const change:ICommitChange = {
      commitMessage: `UnBind Resource`,
      branch: 'main',
      actions
    }

    const result = await this.git.getGitProvider().commitContent(change, repo, gitToken);

    const resultBody = await result.value.json();
    if (!result.isSuccuess) {
      console.error(`ERROR: Failed to unbind ${input.envName}. Response: ${result}`);
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
    repo: IRepositoryInfo,
    entityCatalog: any,
    action: string,
    gitSecretName: string,
  ): Promise<{ status: string; message?: string }> {
    const gitToken = await this.getGitToken(gitSecretName);

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

    const change:ICommitChange = {
      commitMessage: `Update Environment Provider`,
      branch: 'main',
      actions
    }

    const result = await this.git.getGitProvider().commitContent(change, repo, gitToken);
    console.log(result)
    let resultBody;

    if (this.gitProvider===GitProviders.GITLAB)
      {
        resultBody = await result.value.json();
      }
      else if (this.gitProvider===GitProviders.GITHUB) 
      {
        resultBody = result.message
      }
    

    
    if (!result.isSuccuess) {
      console.error(
        `ERROR: Failed to Update provider ${provider.name}. Response: ${result}`,
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
