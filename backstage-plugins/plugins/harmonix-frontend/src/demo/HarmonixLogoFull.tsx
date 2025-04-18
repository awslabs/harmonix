// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  svg: {
    width: '100%',
    height: 100,
    color: '#003181'
  },
  st0path: {
    fill: '#FFFFFF',
  },
  st1path: {
    fill: '#FF9900',
    fillRule: 'evenodd',
    clipRule: 'evenodd',
  },
  st123path: {
    fill: '#003181',
    fillOpacity: 1,
    fillRule: 'nonzero',
    stroke: 'none',
  },
  st113path: {
    fill: 'none',
    stroke: '#003181',
    strokeWidth: 46.694,
    strokeLinecap: 'butt',
    strokeLinejoin: 'miter',
    strokeMiterlimit: 10,
    strokeDasharray: 'none',
    strokeOpacity: 1,
  }
});

export const HarmonixLogoFull = () => {
  const classes = useStyles();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1737.2 183.1" className={classes.svg}>
    <g>
      <g id="Layer_1">
        <path fill='currentColor' className="cls-1" d="M1463.7,179.9V2.9h27.9v177h-27.9Z"/>
        <path fill='currentColor' className="cls-1" d="M1112.9,105.6c-5.5,31.5-29.4,53.9-63.8,53.9s-58.4-22.3-63.8-53.9h-28.9c6.2,45.3,42.3,77.5,92.7,77.5s86.5-32.2,92.7-77.5h-29Z"/>
        <g>
          <polygon fill='currentColor' className="cls-1" points="306.8 48.9 315.9 26 315.9 26.1 325.3 2.9 298.6 2.9 224.7 179.9 253.9 179.9 306.8 48.9"/>
          <polygon fill='currentColor' className="cls-1" points="334.2 4.8 320.8 38.2 353.5 119.7 287.9 119.7 278.3 143.3 361.6 143.3 376.7 179.9 407.3 179.9 334.2 4.8"/>
        </g>
        <g>
          <polygon fill='currentColor' className="cls-1" points="130.8 2.9 130.8 77.2 36.9 77.2 36.9 100.9 130.8 100.9 130.8 179.9 158.6 179.9 158.6 2.9 130.8 2.9"/>
          <polygon fill='currentColor' className="cls-1" points="27.9 77.2 27.9 77.2 27.9 2.9 0 2.9 0 179.9 27.9 179.9 27.9 100.9 27.9 100.9 27.9 77.2"/>
        </g>
        <path fill='currentColor' className="cls-1" d="M565.4,109.1c23.7-2.9,46.3-19.9,46.3-51.8s-24.3-54.4-59.7-54.4h-78.3v76.4h27.9V26.3h46.8c20.1,0,34.6,12.5,34.6,31.1s-14.5,31.1-34.6,31.1h-46.8s-27.9,0-27.9,0v91.6h27.9v-68.2h34.9l44.3,68.2h32.3l-47.7-70.9Z"/>
        <g>
          <polygon fill='currentColor' className="cls-1" points="788.1 179.9 846.3 48 850.1 39.3 850.1 39.5 866.2 2.9 838.1 2.9 784 130 729.9 2.9 690 2.9 690 179.9 717.9 179.9 717.9 39.3 778.1 179.9 788.1 179.9"/>
          <polygon fill='currentColor' className="cls-1" points="850.1 66.8 850.1 179.9 877.9 179.9 877.9 3.6 850.1 66.8"/>
        </g>
        <g>
          <polygon fill='currentColor' className="cls-1" points="1378.4 163.1 1378.4 2.9 1350.5 2.9 1350.5 120.8 1378.4 163.1"/>
          <polygon fill='currentColor' className="cls-1" points="1342.9 125.6 1249.3 2.9 1220.6 2.9 1220.6 179.9 1248.5 179.9 1248.5 44.1 1351.3 179.9 1378.4 179.9 1378.4 179.5 1342.9 125.6"/>
        </g>
        <polygon fill='currentColor' className="cls-1" points="1654.5 116.1 1703.8 179.9 1737.2 179.9 1671.4 94.7 1654.5 116.1"/>
        <polygon fill='currentColor' className="cls-1" points="1591.9 181 1732.3 2.9 1699.3 2.9 1648 70.9 1596.4 2.9 1562.7 2.9 1629.9 89.2 1558.5 179.9 1591.9 181"/>
        <path fill='currentColor' className="cls-1" d="M984.3,96.1c0-1.5-.1-3-.1-4.6,0-39,25.1-67.9,65-67.9s65,28.9,65,67.9,0,3.1-.1,4.6h28.8c0-1.5.1-3,.1-4.6,0-52.6-38.2-91.6-93.7-91.6s-93.7,39-93.7,91.6,0,3.1.1,4.6h28.8Z"/>
      </g>
    </g>
  </svg>
  );
};
