import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';
import { Feature, FeatureItem } from './HomepageFeature';
import Carousel from 'react-bootstrap/Carousel';

type FeatureGroup = {
  direction: "ltr" | "rtl";
  FeatureItems: FeatureItem[]
}

const opaMainVideoContent = (
  <div className='opa-video-item'>
  <h4>The Platformers - Harmonix on AWS</h4>
  <iframe width="400" height="225" src="https://www.youtube.com/embed/h9HwnkkmQPA/1.jpg?" title="What is OPA on AWS + Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div> 
)

const opaSecondVideoContent = (
  <div className='opa-video-item'>
  <h4>Harmonix on AWS at PlatformCon 2024</h4>
  <iframe width="400" height="225" src="https://www.youtube.com/embed/cjovvIWdgRU/1.jpg" title="Unlocking Platform Engineer Efficiency: Automation Strategies with Backstage" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>
)

const opaThirdVideoContent = (
  <div className='opa-video-item'>
    <h4>Containers from the couch</h4>
    <iframe width="400" height="225" src="https://www.youtube.com/embed/EN6mlTX71Ts/1.jpg?" title="OPA on AWS" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </div>
)
const opaForthVideoContent = (
  <div className='opa-video-item'>
  <h4>Harmonix on AWS at BackstageCon 2023</h4>
  <iframe width="400" height="225" src="https://www.youtube.com/embed/40B6YmmhOvI/2.jpg?start=670" title="Let’s Go Backstage: End to End IDP Tips &amp; Tricks for Platform Engineers - Oshrat Nir &amp; Guy Menahem" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>
)

const opaFifthVideoContent = (
  <div className='opa-video-item'>
  <h4>Harmonix on AWS Tech Playlist</h4>
  {/* <iframe width="400" height="250" src="https://www.youtube.com/embed/videoseries?si=1ajMAQG975guA5ha&amp;list=PLhr1KZpdzukcf5e7vYOVkpw4h-rzy7Pn3"  title="OPA on AWS Playlist" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> */}
  <iframe width="400" height="225" src="https://www.youtube.com/embed/videoseries?si=1ajMAQG975guA5ha&amp;list=PLhr1KZpdzukcf5e7vYOVkpw4h-rzy7Pn3"  title="OPA on AWS Playlist" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>
)
const opaSixthVideoContent = (
  <div className='opa-video-item'>
  <h4>Container days Conference 2024</h4>
  <iframe width="400" height="225" src="https://www.youtube.com/embed/Sg0X4RPJbvQ/2.jpg?start=1451" title="Building modern Architectures and Developer Acceleration" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>
)

const carouselContent = (
  <div className='carouselTitle'>
  <Carousel data-bs-theme="dark" interval={4200} pause={'hover'} touch={true} title='' >
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW RELEASE 0.3.4 🚀</h4>
      <p><b>V0.3.4</b></p>
      <p>Checkout the new release notes <a href="/docs/CHANGELOG" >--> here</a> </p>
    </Carousel.Caption>
  </Carousel.Item>
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW 🚀</h4>
      <p><b>GitHub Source Control Integration</b></p>
      <p>Harmonix on AWS is now integrated with both GitHub & Gitlab Source control <br/>You can even extend it to more git providers. Read more <a href="/docs/integration/git" >-->here</a></p>
    </Carousel.Caption>
  </Carousel.Item>
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW 🚀</h4>
      <p><b>Terraform ECS Provider Template</b></p>
      <p>A New Terraform template to provision AWS ECS Clusters</p>
    </Carousel.Caption>
  </Carousel.Item>
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW 🚀</h4>
      <p><b>GenAI provider and RAG app</b></p>
      <p>New GenAI Provider for development of GenAI Applications <br/> A new RAG demo app to get you started quickly <a href="/docs/category/generative-ai">Click here for more details</a></p>
    </Carousel.Caption>
  </Carousel.Item>
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW 🚀</h4>
      <p><b>AWS SecretsManager shared resource</b></p>
      <p>You can now create shared secrets on AWS and easily bind them to applications</p>
    </Carousel.Caption>
  </Carousel.Item>
  <Carousel.Item>
    <Carousel.Caption style={{minHeight:'120px'}}>
      <h4>🚀 NEW 🚀</h4>
      <p><b>AWS Control Tower & AFT Integration</b></p>
      <p>Step by Step <a href="/docs/integration/control-tower-and-aft" >Documentation</a> how to integrate Harmonix on AWS <br/> with AWS Control Tower and AFT (Account Factory for Terraform)</p>
    </Carousel.Caption>
  </Carousel.Item>
  


</Carousel>
</div>
)

const EnterpriseFeatureList: FeatureItem[] = [
  {
    title: 'Single Pane of Glass',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/dashboard.svg').default,
    description: (
      <>
       Provision and monitor all environments, resources, and applications in one place
      </>
    ),
  },
  {
    title: 'Enterprise Ready',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/global_enterprise.svg').default,
    description: (
      <>
       Built with common enterprise patterns: self-managed provisioning, compliant, SCM for IAC and policy statements, and automated operations via pipelines
       </>
    ),
  },
  {
    // title: 'Pleasurable Developer Experience',
    title: 'Empower Your Developers',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/cloud_developer.svg').default,
    description: (
      <>
        Return to the classic days of writing application code on your local environment, you won’t even notice it’s AWS!
      </>
    ),
  },
];

const opaDescription : FeatureItem[] = [
  {
    title: 'OPA on AWS',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    customTextStyle:{fontSize:'24px', textAlign:'left', maxWidth:'100%', margin:'auto', minHeight:'275px'},
    description: (
      <div className="opaDescription">
       <b>Harmonix on AWS </b> (Previously known as OPA on AWS) is an open source reference implementation that ties together AWS services into an enterprise-ready offering. By abstracting AWS services, Harmonix on AWS allows application developers to focus on what they do best – write application logic! <br/> <br/> Platform engineering teams can promote best practices at-scale, while providing a productive and pleasurable experience for non-cloud developers  <br/> <br/> Harmonix on AWS reduces the time to build your customized developer portal by up to 80%
      </div>
    ),
  },
]

const opaMainVideo : FeatureItem[] = [
  {
    title: 'video1',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaMainVideoContent}
      </>
    ),
  },
  {
    title: 'video2',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaSecondVideoContent}
      </>
    ),
  },
  {
    title: 'video3',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaThirdVideoContent}
      </>
    ),
  },
  {
    title: 'video4',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaForthVideoContent}
      </>
    ),
  },
  {
    title: 'video5',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaFifthVideoContent}
      </>
    ),
  },
  {
    title: 'video6',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    // customTextStyle:{fontSize:'24px', maxWidth:'70%',minHeight:'170px'},
    description: (
      <>
       {opaSixthVideoContent}
      </>
    ),
  },
]

const opaCarousel : FeatureItem[] = [
  {
    title: 'Updates',
    Svg: require('@site/static/img/regulations.svg').default,
    noSVG:true,
    minHeight:'300px',
    customTextStyle:{fontSize:'24px', maxWidth:'100%', margin:'auto',minHeight:'170px'},
    description: (
      <>
       {carouselContent}
      </>
    ),
  },
]


const SpeedFeatureList: FeatureItem[] = [
  {
    title: 'Templated Environments',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/regulations.svg').default,
    description: (
      <>
        Includes out of the box environments, applications, patterns, and resources and add more easily
      </>
    ),
  },
  {
    title: 'Cloud Acceleration',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/person_go_fast.svg').default,
    // Svg: require('@site/static/img/cloud_accelerate.svg').default,
    description: (
      <>
        No cloud skills? No problem! Build applications on AWS without knowing AWS
      </>
    ),
  },
  {
    // title: 'Powered by Backstage.io',
    title: 'Pluggable Architecture',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/multi-feature.svg').default,
    description: (
      <>
        Built on the CNCF Backstage developer portal, enjoy 100’s of plugins to customize the developer experience
      </>
    ),
  },

];

const ScaleFeatureList: FeatureItem[] = [
  {
    title: 'Increase Productivity, Reduce Costs',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/time_savings.svg').default,
    description: (
      <>
        Save time and money by scaling your cloud talent and increasing productivity across the board
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/write_code.svg').default,
    description: (
      <>
       Build applications easy, fast, and at scale while maintaining your security standards and guardrails
      </>
    ),
  },
  {
    title: 'Scale Development',
    customTextStyle:{minHeight:'23rem'},
    Svg: require('@site/static/img/scale.svg').default,
    description: (
      <>
       Build hundreds of apps on hundreds of environments for hundreds of teams - on AWS cloud
       </>
    ),
  },
];

const FeatureList: FeatureItem[] = [
  {
    title: 'Single pane of glass',
    Svg: require('@site/static/img/time_savings.svg').default,
    description: (
      <>
       Provision and monitor all environments, resources, and applications in one place.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    Svg: require('@site/static/img/write_code.svg').default,
    description: (
      <>
       Build applications easy, fast, and at scale while maintaining your security standards and guardrails.
      </>
    ),
  },
  {
    title: 'Pleasurable Developer Experience',
    Svg: require('@site/static/img/cloud_developer.svg').default,
    description: (
      <>
        Return to the classic days of writing application code on your local environment, you won’t even notice it’s AWS!
      </>
    ),
  },
  {
    title: 'Templated Environments',
    Svg: require('@site/static/img/regulations.svg').default,
    description: (
      <>
        Includes out of the box environments, applications, patterns, and resources and add more easily.
      </>
    ),
  },
  {
    title: 'Cloud Acceleration',
    Svg: require('@site/static/img/person_go_fast.svg').default,
    // Svg: require('@site/static/img/cloud_accelerate.svg').default,
    description: (
      <>
        No cloud skills? No problem! Build applications on AWS without knowing AWS.
      </>
    ),
  },
  {
    title: 'Powered by Backstage.io',
    Svg: require('@site/static/img/Backstage_Icon_Teal.svg').default,
    description: (
      <>
        Enjoy the 100+ of available plugins, and maintain your own tooling and preferences, while enjoying all the advantages that AWS has to offer.
      </>
    ),
  },
  {
    title: 'increase productivity, reduce costs',
    Svg: require('@site/static/img/time_savings.svg').default,
    description: (
      <>
        Save time and money by scaling your cloud talent and increasing productivity across the board
      </>
    ),
  },
  {
    title: 'Enterprise-ready',
    Svg: require('@site/static/img/time_savings.svg').default,
    description: (
      <>
       Built with common enterprise patterns: self-managed provisioning, compliant, SCM for IAC and policy statements, and automated operations via pipelines      
       </>
    ),
  },
  {
    title: 'Scale Development',
    Svg: require('@site/static/img/time_savings.svg').default,
    description: (
      <>
       Build hundreds of apps on hundreds of environments for hundreds of teams - on AWS cloud
       </>
    ),
  },
];

const opaImageList : FeatureItem [] = [
  {
    title: '',
    Svg: require('@site/static/img/dashboard.svg').default,
    noSVG: true,
    description: (
      <>
       <span className="imageSubtitle">AWS Software catalog in a click of a button </span> <img width={'100%'} src="img/opa/opa-screenshot11.png"/>
      </>
    ),
  },
  {
    title: '',
    Svg: require('@site/static/img/write_code.svg').default,
    noSVG: true,
    description: (
      <>
        <span className="imageSubtitle">Scale the use of AWS Services using templates</span> <img width={'100%'} src="img/opa/opa-screenshot22.png"/>
      </>
    ),
  },
  {
    // title: 'Pleasurable Developer Experience',
    title: '',
    Svg: require('@site/static/img/cloud_developer.svg').default,
    noSVG: true,
    description: (
      <>
      <span className="imageSubtitle">Manage your applications using a single interface </span> <img width={'100%'} src="img/opa/opa-screenshot33.png"/>
      </>
    ),
  },
]

const FeatureRowList: FeatureGroup[] = [
  {
    direction: "ltr",
    FeatureItems: opaCarousel,
  },
  {
    direction: "ltr",
    FeatureItems: opaMainVideo,
  },
  {
    direction: "ltr",
    FeatureItems: opaDescription,
  },
  

  {
    direction: "ltr",
    FeatureItems: opaImageList,
  },
  {
    direction: "ltr",
    FeatureItems: EnterpriseFeatureList,
  },
  {
    direction: "ltr",
    FeatureItems: SpeedFeatureList,
  },

  {
    direction: "ltr",
    FeatureItems: ScaleFeatureList,
  },
]

export default function HomepageFeatures(): JSX.Element {
  return (
    <div>
      {FeatureRowList.map((props, idx1) => (
        <section key={idx1} className={clsx("row", styles.features, styles.featureRow, styles.sectionItem)}>
          {props.FeatureItems.map((props, idx2) => (
            <Feature key={idx2} {...props} />
          ))}
        </section>
      ))}
    </div>
  );
}
