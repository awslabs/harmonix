import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

export type FeatureItem = {
  title: string;
  noSVG?:boolean;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
  minHeight?: string;
  customTextStyle?: React.CSSProperties;
};

export function Feature({title,noSVG, Svg, description, minHeight, customTextStyle}: FeatureItem) {
  return (
    noSVG? (
    <div className={clsx('col')}>
       <div className="padding-horiz--md" style={{textAlign:'center', alignSelf: 'flex-start'}}>
        <p style={customTextStyle}>{description}</p>
      </div>
    </div>  
    ):
    <div className={clsx('col col--4')} style={customTextStyle}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}