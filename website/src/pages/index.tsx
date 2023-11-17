import React from 'react';
import clsx from 'clsx';

import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Grid from '@mui/material/Grid';
import styles from './index.module.css';
// import 'bootstrap/dist/css/bootstrap.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
    {/* <header className={clsx('hero hero--primary', styles.heroBanner)} style={{backgroundImage: `url('/img/bg_splash.png')`}} > */}
        {/* <div className='bg-splash'>
          <img src={useBaseUrl('img/bg_splash.svg')} />
        </div> */}
      <Grid container spacing={3} className="perspective-container">
        <Grid item xs={6} className="hero hero--primary bgimg logoWrapper">
          <span className='logoText1'>Orchestrate Platforms <br/>and Applications</span>
          <span className='logoText2'>on AWS</span>
        </Grid>
        <Grid className='tagWrapper' item xs={5}>
          <Grid container direction="column" spacing={2} style={{display: 'flex'}}>
            <Grid item  className="hero__subtitle tagline" style={{display: 'flex', alignItems: 'left', marginTop: 50, paddingRight: 50}}>
              <p>{siteConfig.tagline}</p>
            </Grid>
            {/* <Grid item style={{alignItems: 'left', textAlign: "center", paddingRight: 50}}>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
              Maecenas elementum venenatis nisl sagittis mattis. Suspendisse.
              </p>
            </Grid> */}
          </Grid>
          <Grid item xs={3}/>
        </Grid>
      </Grid>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Fast, secure, and at-scale. A developer portal to meet your Enterprise needs."> 
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
