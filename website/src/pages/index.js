import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./index.module.css";
// eslint-disable-next-line no-unused-vars
import useStateMachine, {t} from '@cassiozen/usestatemachine';

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  return (
    <Layout title="" description={siteConfig.tagline}>
      <header className={`hero ${styles.heroBanner}`}>
        <div className="container">
          <img
            alt="useStateMachine logo"
            className={`${styles.heroBannerLogo} margin-vert--md`}
            src={useBaseUrl("img/logo.png")}
          />
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={`button button--primary button--lg ${styles.getStarted}`}
              to={useBaseUrl("docs/getting-started")}
            >
              Get Started&nbsp;&nbsp;→
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className={styles.section}>
          <div className="container text--center margin-bottom--xl">
            <div className="row">
              <div className="col">
                <img
                  className={styles.featureImage}
                  alt="Batteries Included"
                  src={useBaseUrl("/img/battery.svg")}
                />
                <h2 className={styles.featureHeading}>
                  Batteries Included
                </h2>
                <p className="padding-horiz--md">
                  
                  Despite the tiny size, useStateMachine is a <span style={{whiteSpace: "nowrap"}}>feature-complete</span>
                  {' '}State Machine library, including features like Entry/Exit callbacks, Guarded transitions
                  & Extended State (Context)
                  
                </p>
              </div>
              <div className="col">
                <img
                  alt="Amazing TypeScript experience"
                  className={styles.featureImage}
                  src={useBaseUrl("/img/typescript.svg")}
                />
                <h2 className={styles.featureHeading}>
                  Amazing TypeScript experience
                </h2>
                <p className="padding-horiz--md">
                  
                  Focus on automatic type inference (auto completion for both TypeScript & JavaScript users
                  without having to manually define the typings) while giving you the option to specify
                  and augment the types for context & events.
                  
                  
                </p>
              </div>
              <div className="col">
                <img
                  alt="Made for React"
                  className={styles.featureImage}
                  src={useBaseUrl("/img/react.svg")}
                />
                <h2 className={styles.featureHeading}>
                  Made for React
                </h2>
                <p className="padding-horiz--md">
                  
                  Instead of introducing many new concepts, useStateMachine follow idiomatic React patterns you and 
                  your team are already familiar with. <br/>
                  The library itself is actually a thin wrapper around Idiomatic React's useReducer & useEffect.
                  
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Home;
