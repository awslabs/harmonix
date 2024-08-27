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
    <header className={clsx('hero hero--primary', styles.heroBanner)} style={{paddingTop:'0'}}>
    {/* <header className={clsx('hero hero--primary', styles.heroBanner)} style={{backgroundImage: `url('/img/bg_splash.png')`}} > */}
        {/* <div className='bg-splash'>
          <img src={useBaseUrl('img/bg_splash.svg')} />
        </div> */}  

      <Grid container spacing={3} className="perspective-container" style={{marginLeft:'0px'}}>
        <Grid container spacing={0} item xs={12} direction="column" alignItems="center" display="flex" justifyContent="center" style={{padding:'0'}}>
              <span style={{color:'#ff9900', fontWeight:'bold', fontStyle:'italic', position:'absolute', top:'5px', zIndex:'1000'}}>📢 OPA on AWS is now "Harmonix on AWS"📢</span>
          </Grid>
        <Grid item xs={5} className="hero hero--primary bgimg logoWrapper">
          {/* <span className='logoText1'>Orchestrate Platforms <br/>and Applications</span> */}
          <span className='logoText2'>on AWS</span>
        </Grid>
        <Grid className='tagWrapper' item xs={7}>
          <Grid container direction="column" spacing={2}>
            <Grid item  className="hero__subtitle tagline" style={{ marginTop: 50, paddingLeft:'50px'}}>
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
      {/* <Row container spacing={3}>
    
      </Row> */}
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
