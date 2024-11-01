// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IconButton } from '@material-ui/core';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import React, { useState } from 'react';

/**
 * A UI component for displaying sensitive strings
 *
 * @param secret The sensitive string to display/hide
 * @returns a JSXElement used for easily displaying/hiding a string via a toggle icon
 */
export const SecretStringComponent = ({ secret }: { secret: string }) => {
  const [hidden, setHidden] = useState(true);

  const toggleVisibility = () => setHidden(!hidden);

  return (
    <>
      {/* <Typography noWrap> */}
      {hidden ? secret.replaceAll(/./g, '●') : secret}
      <IconButton onClick={toggleVisibility}>
        {hidden ? <VisibilityOff /> : <Visibility />}
      </IconButton>
      {/* </Typography> */}
    </>
  );
};
