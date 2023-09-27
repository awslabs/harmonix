import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import { Construct } from "constructs";

export interface CdkBaseStackProps extends cdk.StackProps {
  vpcId: string;
  efsName?: string;
  efsAccessPointPath?: string;
}

export class CdkEfsModuleStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly efsInstance: efs.IFileSystem;

  constructor(scope: Construct, id: string, props: CdkBaseStackProps) {
    super(scope, id, props);

    this.vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

    // Define the File System properties
    const efsConfig: efs.FileSystemProps = {
      vpc: this.vpc,
      fileSystemName: props.efsName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,  // default, TODO: allow the performance mode to be passed in as a parameter
    };

    // create the EFS instance
    this.efsInstance = new efs.FileSystem(this, props.efsName ?? "efsInstance", efsConfig);

    // Create an access point for the EFS instance
    const accessPoint = new efs.AccessPoint(this, "efsAccessPoint", {
      fileSystem: this.efsInstance,
      path: props.efsAccessPointPath || "/data",
      createAcl: {
        ownerGid: "1000",
        ownerUid: "1000",
        permissions: "750",
      },
      posixUser: {
        uid: "1000",
        gid: "1000",
      },
    });

    // allow connections from within the VPC
    this.efsInstance.connections.allowDefaultPortFrom(
      {
        connections: new ec2.Connections({
          peer: ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
        }),
      },
      `Allow connections from within VPC ${this.vpc.vpcId}`
    );

    // Provide CFN Output values relevant for the newly created File System
    new cdk.CfnOutput(this, "opaEfsArn", {
      description: "Arn for the EFS file system",
      value: this.efsInstance.fileSystemArn,
    });
    new cdk.CfnOutput(this, "opaEfsId", {
      description: "ID of the EFS file system",
      value: this.efsInstance.fileSystemId,
    });
    new cdk.CfnOutput(this, "opaEfsSecurityGroupId", {
      description: "Security Group for the EFS instance",
      value: this.efsInstance.connections.securityGroups[0].securityGroupId,
    });
    new cdk.CfnOutput(this, "opaEfsAccessPointId", {
      description: "ID of the EFS access point",
      value: accessPoint.accessPointId,
    });
  }
}
