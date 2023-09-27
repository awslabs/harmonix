// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { EmptyState, LogViewer, TableColumn, Table } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { opaApiRef } from '../../api';
import { formatWithTime } from '../../helpers/date-utils';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import FileDownload from '@mui/icons-material/FileDownload';
import { LinearProgress } from '@material-ui/core';
import { saveAs as FileSaver } from 'file-saver';
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import {
  AWSComponent,
  isAWSECSAppDeploymentEnvironment,
  isAWSEKSAppDeploymentEnvironment,
  isAWSServerlessAppDeploymentEnvironment
} from '@aws/plugin-aws-apps-common-for-backstage';

interface TableData {
  name: string;
  arn: string;
  lastEventTime: string;
  logGroupName: string;
}

const useStyles = makeStyles(theme => ({
  container: {
    width: 850,
  },
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
}));

type LogsTableInput = {
  logGroupNames: string[];
  stackName?: string;
  awsComponent: AWSComponent
};

type LogGroupStreams = {
  logGroupName: string;
  logStreamsList: LogStream[];
}

const CloudwatchLogsTable = ({ input: { logGroupNames, stackName } }: { input: LogsTableInput }) => {
  const emptyLogStreams = [...logGroupNames.map(_ => [])];
  const classes = useStyles();
  const api = useApi(opaApiRef);

  const [logStreams, setLogStreams] = useState<Array<TableData[]>>(emptyLogStreams);
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');
  const [logStreamName, setLogStreamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogLoading, setDialogLoading] = useState(true);
  const [dialogError, setDialogError] = useState<{ isError: boolean; errorMsg: string | null }>({
    isError: false,
    errorMsg: null,
  });
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });

  useEffect(() => {
    setLoading(true);

    Promise.all(
      logGroupNames.map(async (logGroupName: string): Promise<LogGroupStreams> => {
        return api.getLogStreamNames({ logGroupName })
          .then(logStreams => { return { logGroupName, logStreamsList: logStreams } as LogGroupStreams });
      })
    ).then(allLogGroupStreams => {

      const streamsData: Array<TableData[]> = [];

      allLogGroupStreams.forEach(logGroupStreams => {
        const logGroupName = logGroupStreams.logGroupName;
        const logStreamsList = logGroupStreams.logStreamsList;

        streamsData.push(
          logStreamsList.map(streamData => {
            const timestamp = streamData.lastEventTimestamp ? streamData.lastEventTimestamp : streamData.creationTime;
            const lastEvent = new Date(timestamp as number);
            return {
              arn: streamData.arn as string,
              name: streamData.logStreamName as string,
              lastEventTime: formatWithTime(lastEvent),
              logGroupName,
            };
          })
        );

      });

      setLogStreams(streamsData);
      setLoading(false);
      setError({ isError: false, errorMsg: '' });

    }).catch(e => {
      console.log(e); // rejectReason of any first rejected promise
      setLoading(false);
      setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving log streams: ${e}` });
    });

  }, []);

  const getLogGroupName = (logGroupName: string) => {
    if (logGroupName.startsWith('API-Gateway')) {
      return "API Gateway";
    } else if (logGroupName.startsWith('/aws/lambda')) {
      let title;
      if (logGroupName.includes('-') && logGroupName.includes('unction')) {
        const parts = logGroupName.split('-').filter(part => part.includes('unction'));
        if (parts.length === 1) {
          title = parts[0];
        }
      }

      if (!title) {
        title = logGroupName.substring('/aws/lambda/'.length);
        if (stackName) {
          title = title.substring(`${stackName}-`.length);
        }
      }
      return `Lambda - ${title}`;
    } else {
      return `Logs - ${logGroupName}`;
    }
  }

  const handleClickOpen = (streamName: string, logGroupName: string) => {
    setOpen(true);
    setLogStreamName(streamName);
    setDialogLoading(true);
    api
      .getLogStreamData({ logGroupName, logStreamName: streamName })
      .then(data => {
        setLogs(data);
        setDialogLoading(false);
        setDialogError({ isError: false, errorMsg: '' });
      })
      .catch(e => {
        setDialogLoading(false);
        setDialogError({ isError: true, errorMsg: `Unexpected error occurred while retrieving log stream data: ${e}` });
      });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const columns: TableColumn[] = [
    {
      title: 'LOG STREAM',
      field: 'logStreamName',
      highlight: true,
      render: (row: Partial<TableData>) => (
        <Link href="#" onClick={() => handleClickOpen(row.name as string, row.logGroupName as string)}>
          {row.name}
        </Link>
      ),
    },
    { title: 'LAST EVENT TIME', field: 'lastEventTime' },
  ];

  if (error.isError) {
    return <Typography sx={{ color: 'red' }}>{error.errorMsg}</Typography>;
  }

  return (
    <>
      {logGroupNames.map((logGroupName, index) => (
        <div key={logGroupName}>

          <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
            <DialogTitle>{logStreamName}</DialogTitle>
            <DialogContent>
              <div style={{ height: '70vh' }}>
                {dialogLoading ? (
                  <LinearProgress />
                ) : dialogError.isError ? (
                  <Typography sx={{ color: 'red' }}>{dialogError.errorMsg}</Typography>
                ) : (
                  <LogViewer text={logs} />
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </Dialog>

          <Table
            isLoading={loading}
            title={logGroupNames.length > 1 ? getLogGroupName(logGroupName) : 'Application Logs'}
            columns={columns}
            data={logStreams[index]}
            options={{
              padding: 'dense',
              actionsColumnIndex: -1,
              actionsCellStyle: { paddingLeft: '14px' },
              headerStyle: {
                paddingRight: '16px',
              },
            }}
            localization={{
              header: {
                actions: 'ACTIONS',
              },
            }}
            emptyContent={<div className={classes.empty}>No data</div>}
            actions={[
              {
                icon: () => <FileDownload />,
                tooltip: 'Download',
                onClick: (_, rowData) => {
                  const clickedStreamName = (rowData as TableData).name;
                  setLoading(true);

                  api
                    .getLogStreamData({ logGroupName, logStreamName: clickedStreamName })
                    .then(data => {
                      setLoading(false);
                      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
                      FileSaver.saveAs(blob, `${clickedStreamName}.txt`);
                    })
                    .catch(() => {
                      setLoading(false);
                    });
                },
              },
            ]}
          />

        </div>
      ))}
    </>
  );
};

export const CloudwatchLogsWidget = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const env = awsAppLoadingStatus.component.currentEnvironment;

    let logGroupNames: string[];
    if (isAWSServerlessAppDeploymentEnvironment(env)) {
      logGroupNames = env.app.logGroupNames;
    } else if (isAWSECSAppDeploymentEnvironment(env)) {
      logGroupNames = [env.app.logGroupName];
    } else if (isAWSEKSAppDeploymentEnvironment(env)) {
      logGroupNames = [env.app.logGroupName];
    } else {
      logGroupNames = [];
    }

    if (logGroupNames && logGroupNames.length > 0) {
      const stackName = '' //env.app.cloudFormation!
      return (
        <CloudwatchLogsTable
          input={{
            logGroupNames,
            stackName,
            awsComponent: awsAppLoadingStatus.component
          }}
        />
      );
    }
    else {
      return <EmptyState missing="data" title="Application Logs" description="Logs would show here" />;
    }
  } else {
    return <EmptyState missing="data" title="Application Logs" description="Logs would show here" />;
  }
};
