// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as eks from "aws-cdk-lib/aws-eks";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import { EKSFluentBitRoleConstruct } from "./eks-env-fluent-bit-role-construct";

export interface OPAEKSManagedNodeClusterFluentBitConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;

  cluster: eks.Cluster
  clusterName: string
  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any
}

export class OPAEKSManagedNodeClusterFluentBitConstruct extends Construct {

  constructor(parent: Construct, name: string, props: OPAEKSManagedNodeClusterFluentBitConstructProps) {
    super(parent, name);

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;

    // Create operations role for the environment
    const fluentBitSARole = new EKSFluentBitRoleConstruct(
      this,
      `${props.clusterName}-fluent-bit-sa-role`,
      {
        awsAccount: props.opaEnv.awsAccount,
        clusterName: props.clusterName,
        clusterOpenIdConnectIssuer: props.cluster.openIdConnectProvider.openIdConnectProviderIssuer,
        cfnOutputScope: props.cfnOutputScope,
      }
    );

    // creating amazon-cloudwatch namespace
    const cloudwatchNSManifest = props.cluster.addManifest(`${envIdentifier}-amazon-cloudwatch-namespace`, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'amazon-cloudwatch', labels: { 'name': 'amazon-cloudwatch' } },
    });

    // Define the fluent-bit-cluster-info ConfigMap manifest
    const fluentBitClusterInfoConfigMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'fluent-bit-cluster-info',
        namespace: 'amazon-cloudwatch',
      },
      data: {
        'cluster.name': `${props.clusterName}`,
        'http.server': 'On',
        'http.port': '2020',
        'read.head': 'Off',
        'read.tail': 'On',
        'logs.region': `${props.opaEnv.awsRegion}`,
      },
    };

    const fluentBitServiceAccount = {
      apiVersion: "v1",
      kind: "ServiceAccount",
      metadata: {
        name: "fluent-bit",
        namespace: "amazon-cloudwatch",
        annotations: {
          'eks.amazonaws.com/role-arn': fluentBitSARole.IAMRole.roleArn
        }
      }
    };

    const fluentBitClusterRole = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "ClusterRole",
      metadata: {
        name: "fluent-bit-role"
      },
      rules: [
        {
          nonResourceURLs: [
            "/metrics"
          ],
          verbs: [
            "get"
          ]
        },
        {
          apiGroups: [
            ""
          ],
          resources: [
            "namespaces",
            "pods",
            "pods/logs",
            "nodes",
            "nodes/proxy"
          ],
          verbs: [
            "get",
            "list",
            "watch"
          ]
        }
      ]
    };

    const fluentBitClusterRoleBinding = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "ClusterRoleBinding",
      metadata: {
        name: "fluent-bit-role-binding"
      },
      roleRef: {
        apiGroup: "rbac.authorization.k8s.io",
        kind: "ClusterRole",
        name: "fluent-bit-role"
      },
      subjects: [
        {
          kind: "ServiceAccount",
          name: "fluent-bit",
          namespace: "amazon-cloudwatch"
        }
      ]
    };

    const fluentBitConfigMap = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "fluent-bit-config",
        namespace: "amazon-cloudwatch",
        labels: {
          'k8s-app': "fluent-bit"
        }
      },
      data: {
        'fluent-bit.conf': "[SERVICE]\n    Flush                     5\n    Grace                     30\n    Log_Level                 info\n    Daemon                    off\n    Parsers_File              parsers.conf\n    HTTP_Server               ${HTTP_SERVER}\n    HTTP_Listen               0.0.0.0\n    HTTP_Port                 ${HTTP_PORT}\n    storage.path              /var/fluent-bit/state/flb-storage/\n    storage.sync              normal\n    storage.checksum          off\n    storage.backlog.mem_limit 5M\n\n@INCLUDE application-log.conf\n@INCLUDE dataplane-log.conf\n@INCLUDE host-log.conf\n",
        'application-log.conf': `[INPUT]\n    Name                tail\n    Tag                 application.*\n    Exclude_Path        /var/log/containers/cloudwatch-agent*, /var/log/containers/fluent-bit*, /var/log/containers/aws-node*, /var/log/containers/kube-proxy*\n    Path                /var/log/containers/*.log\n    multiline.parser    docker, cri\n    DB                  /var/fluent-bit/state/flb_container.db\n    Mem_Buf_Limit       50MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Rotate_Wait         30\n    storage.type        filesystem\n    Read_from_Head      \${READ_FROM_HEAD}\n\n[INPUT]\n    Name                tail\n    Tag                 application.*\n    Path                /var/log/containers/fluent-bit*\n    multiline.parser    docker, cri\n    DB                  /var/fluent-bit/state/flb_log.db\n    Mem_Buf_Limit       5MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Read_from_Head      \${READ_FROM_HEAD}\n\n[INPUT]\n    Name                tail\n    Tag                 application.*\n    Path                /var/log/containers/cloudwatch-agent*\n    multiline.parser    docker, cri\n    DB                  /var/fluent-bit/state/flb_cwagent.db\n    Mem_Buf_Limit       5MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Read_from_Head      \${READ_FROM_HEAD}\n\n[FILTER]\n    Name                kubernetes\n    Match               application.*\n    Kube_URL            https://kubernetes.default.svc:443\n    Kube_Tag_Prefix     application.var.log.containers.\n    Merge_Log           On\n    Merge_Log_Key       log_processed\n    K8S-Logging.Parser  On\n    K8S-Logging.Exclude Off\n    Labels              Off\n    Annotations         Off\n    Use_Kubelet         On\n    Kubelet_Port        10250\n    Buffer_Size         0\n\n[OUTPUT]\n    Name                cloudwatch_logs\n    Match               application.*\n    region              \${AWS_REGION}\n    log_group_name      /aws/apps/${envIdentifier}\n    log_stream_prefix   fluent-bit-fallback-\n    log_group_template /aws/apps/${envIdentifier}/$kubernetes['namespace_name']\n    log_stream_template $kubernetes['pod_name'].$kubernetes['container_name']\n    auto_create_group   true\n    extra_user_agent    container-insights\n`,
        'dataplane-log.conf': "[INPUT]\n    Name                systemd\n    Tag                 dataplane.systemd.*\n    Systemd_Filter      _SYSTEMD_UNIT=docker.service\n    Systemd_Filter      _SYSTEMD_UNIT=containerd.service\n    Systemd_Filter      _SYSTEMD_UNIT=kubelet.service\n    DB                  /var/fluent-bit/state/systemd.db\n    Path                /var/log/journal\n    Read_From_Tail      ${READ_FROM_TAIL}\n\n[INPUT]\n    Name                tail\n    Tag                 dataplane.tail.*\n    Path                /var/log/containers/aws-node*, /var/log/containers/kube-proxy*\n    multiline.parser    docker, cri\n    DB                  /var/fluent-bit/state/flb_dataplane_tail.db\n    Mem_Buf_Limit       50MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Rotate_Wait         30\n    storage.type        filesystem\n    Read_from_Head      ${READ_FROM_HEAD}\n\n[FILTER]\n    Name                modify\n    Match               dataplane.systemd.*\n    Rename              _HOSTNAME                   hostname\n    Rename              _SYSTEMD_UNIT               systemd_unit\n    Rename              MESSAGE                     message\n    Remove_regex        ^((?!hostname|systemd_unit|message).)*$\n\n[FILTER]\n    Name                aws\n    Match               dataplane.*\n    imds_version        v2\n\n[OUTPUT]\n    Name                cloudwatch_logs\n    Match               dataplane.*\n    region              ${AWS_REGION}\n    log_group_name      /aws/containerinsights/${CLUSTER_NAME}/dataplane\n    log_stream_prefix   ${HOST_NAME}-\n    auto_create_group   true\n    extra_user_agent    container-insights\n",
        'host-log.conf': "[INPUT]\n    Name                tail\n    Tag                 host.dmesg\n    Path                /var/log/dmesg\n    Key                 message\n    DB                  /var/fluent-bit/state/flb_dmesg.db\n    Mem_Buf_Limit       5MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Read_from_Head      ${READ_FROM_HEAD}\n\n[INPUT]\n    Name                tail\n    Tag                 host.messages\n    Path                /var/log/messages\n    Parser              syslog\n    DB                  /var/fluent-bit/state/flb_messages.db\n    Mem_Buf_Limit       5MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Read_from_Head      ${READ_FROM_HEAD}\n\n[INPUT]\n    Name                tail\n    Tag                 host.secure\n    Path                /var/log/secure\n    Parser              syslog\n    DB                  /var/fluent-bit/state/flb_secure.db\n    Mem_Buf_Limit       5MB\n    Skip_Long_Lines     On\n    Refresh_Interval    10\n    Read_from_Head      ${READ_FROM_HEAD}\n\n[FILTER]\n    Name                aws\n    Match               host.*\n    imds_version        v2\n\n[OUTPUT]\n    Name                cloudwatch_logs\n    Match               host.*\n    region              ${AWS_REGION}\n    log_group_name      /aws/containerinsights/${CLUSTER_NAME}/host\n    log_stream_prefix   ${HOST_NAME}.\n    auto_create_group   true\n    extra_user_agent    container-insights\n",
        'parsers.conf': "[PARSER]\n    Name                syslog\n    Format              regex\n    Regex               ^(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$\n    Time_Key            time\n    Time_Format         %b %d %H:%M:%S\n\n[PARSER]\n    Name                container_firstline\n    Format              regex\n    Regex               (?<log>(?<=\"log\":\")\\S(?!\\.).*?)(?<!\\\\)\".*(?<stream>(?<=\"stream\":\").*?)\".*(?<time>\\d{4}-\\d{1,2}-\\d{1,2}T\\d{2}:\\d{2}:\\d{2}\\.\\w*).*(?=})\n    Time_Key            time\n    Time_Format         %Y-%m-%dT%H:%M:%S.%LZ\n\n[PARSER]\n    Name                cwagent_firstline\n    Format              regex\n    Regex               (?<log>(?<=\"log\":\")\\d{4}[\\/-]\\d{1,2}[\\/-]\\d{1,2}[ T]\\d{2}:\\d{2}:\\d{2}(?!\\.).*?)(?<!\\\\)\".*(?<stream>(?<=\"stream\":\").*?)\".*(?<time>\\d{4}-\\d{1,2}-\\d{1,2}T\\d{2}:\\d{2}:\\d{2}\\.\\w*).*(?=})\n    Time_Key            time\n    Time_Format         %Y-%m-%dT%H:%M:%S.%LZ\n"
      }
    };

    const fluentBitDaemonSet = {
      apiVersion: "apps/v1",
      kind: "DaemonSet",
      metadata: {
        name: "fluent-bit",
        namespace: "amazon-cloudwatch",
        labels: {
          'k8s-app': "fluent-bit",
          version: "v1",
          'kubernetes.io/cluster-service': "true"
        }
      },
      spec: {
        selector: {
          matchLabels: {
            'k8s-app': "fluent-bit"
          }
        },
        template: {
          metadata: {
            labels: {
              'k8s-app': "fluent-bit",
              version: "v1",
              'kubernetes.io/cluster-service': "true"
            }
          },
          spec: {
            containers: [
              {
                name: "fluent-bit",
                image: "public.ecr.aws/aws-observability/aws-for-fluent-bit:stable",
                imagePullPolicy: "Always",
                env: [
                  {
                    name: "AWS_REGION",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "logs.region"
                      }
                    }
                  },
                  {
                    name: "CLUSTER_NAME",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "cluster.name"
                      }
                    }
                  },
                  {
                    name: "HTTP_SERVER",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "http.server"
                      }
                    }
                  },
                  {
                    name: "HTTP_PORT",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "http.port"
                      }
                    }
                  },
                  {
                    name: "READ_FROM_HEAD",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "read.head"
                      }
                    }
                  },
                  {
                    name: "READ_FROM_TAIL",
                    valueFrom: {
                      configMapKeyRef: {
                        name: "fluent-bit-cluster-info",
                        key: "read.tail"
                      }
                    }
                  },
                  {
                    name: "HOST_NAME",
                    valueFrom: {
                      fieldRef: {
                        fieldPath: "spec.nodeName"
                      }
                    }
                  },
                  {
                    name: "HOSTNAME",
                    valueFrom: {
                      fieldRef: {
                        apiVersion: "v1",
                        fieldPath: "metadata.name"
                      }
                    }
                  },
                  {
                    name: "CI_VERSION",
                    value: "k8s/1.3.17"
                  }
                ],
                resources: {
                  limits: {
                    memory: "200Mi"
                  },
                  requests: {
                    cpu: "500m",
                    memory: "100Mi"
                  }
                },
                volumeMounts: [
                  {
                    name: "fluentbitstate",
                    mountPath: "/var/fluent-bit/state"
                  },
                  {
                    name: "varlog",
                    mountPath: "/var/log",
                    readOnly: true
                  },
                  {
                    name: "varlibdockercontainers",
                    mountPath: "/var/lib/docker/containers",
                    readOnly: true
                  },
                  {
                    name: "fluent-bit-config",
                    mountPath: "/fluent-bit/etc/"
                  },
                  {
                    name: "runlogjournal",
                    mountPath: "/run/log/journal",
                    readOnly: true
                  },
                  {
                    name: "dmesg",
                    mountPath: "/var/log/dmesg",
                    readOnly: true
                  }
                ]
              }
            ],
            terminationGracePeriodSeconds: 10,
            hostNetwork: true,
            dnsPolicy: "ClusterFirstWithHostNet",
            volumes: [
              {
                name: "fluentbitstate",
                hostPath: {
                  path: "/var/fluent-bit/state"
                }
              },
              {
                name: "varlog",
                hostPath: {
                  path: "/var/log"
                }
              },
              {
                name: "varlibdockercontainers",
                hostPath: {
                  path: "/var/lib/docker/containers"
                }
              },
              {
                name: "fluent-bit-config",
                configMap: {
                  name: "fluent-bit-config"
                }
              },
              {
                name: "runlogjournal",
                hostPath: {
                  path: "/run/log/journal"
                }
              },
              {
                name: "dmesg",
                hostPath: {
                  path: "/var/log/dmesg"
                }
              }
            ],
            serviceAccountName: "fluent-bit"
          }
        }
      }
    };

    // Deploy the Fluent-Bit manifests to the cluster
    const fluentBitManifests = props.cluster.addManifest('FluentBitManifests',
      fluentBitClusterInfoConfigMap,
      fluentBitServiceAccount,
      fluentBitClusterRole,
      fluentBitClusterRoleBinding,
      fluentBitConfigMap,
      fluentBitDaemonSet,
    );

    // This will fail to deploy if you don't ensure that the amazon-cloudwatch namespace is created first
    fluentBitManifests.node.addDependency(cloudwatchNSManifest);

  }

}
