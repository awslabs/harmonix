import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import styles from "./index.module.css";

function AnnouncementBanner() {
  return (
    <Box
      sx={{
        backgroundColor: "#071A45",
        color: "white",
        padding: "10px 0",
        position: "relative",
        textAlign: "center",
        width: "100%",
        zIndex: 1000,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: "medium" }}>
          <span style={{ color: "#ff9900", marginRight: "8px" }}>📢</span>
          OPA on AWS is now "Harmonix on AWS"
          <span style={{ color: "#ff9900", marginLeft: "8px" }}>📢</span>
        </Typography>
      </Container>
    </Box>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx(styles.heroBanner)}>
      <AnnouncementBanner />

      <Box
        sx={{
          background: "linear-gradient(135deg, #0D317F 0%, #154199 50%, #1E63CC 100%)",
          padding: "60px 0 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12}>
              <Box className={styles.heroContent}>
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    marginBottom: "16px",
                    fontSize: { xs: "2.5rem", md: "5.5rem" },
                    textAlign: { xs: "center", sm: "center" }
                  }}
                >
                  Harmonix
                </Typography>

                <Typography
                  variant="h2"
                  component="span"
                  className={styles.logoText2}
                  sx={{
                    color: "#ff9900",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "24px",
                    fontSize: { xs: "2rem", md: "2.5rem" },
                    textAlign: { xs: "center", sm: "center" }
                  }}
                >
                  on AWS
                </Typography>

                <Typography
                  variant="h3"
                  component="p"
                  className="hero__subtitle tagline"
                  sx={{
                    color: "white",
                    marginBottom: "32px",
                    fontSize: { xs: "1.25rem", md: "1.5rem" },
                    fontWeight: 400,
                    lineHeight: 1.5,
                    textAlign: { xs: "center", sm: "center" },
                    mx: "auto"
                  }}
                >
                  {siteConfig.tagline}
                </Typography>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  <Button
                    variant="contained"
                    component={Link}
                    to="/docs/intro"
                    size="large"
                    sx={{
                      backgroundColor: "#ff9900",
                      "&:hover": {
                        backgroundColor: "#e68a00",
                      },
                    }}
                  >
                    Get Started
                  </Button>

                  <Button
                    variant="outlined"
                    component={Link}
                    to="/docs"
                    size="large"
                    sx={{
                      borderColor: "white",
                      color: "white",
                      "&:hover": {
                        borderColor: "#ff9900",
                        backgroundColor: "rgba(255, 153, 0, 0.1)",
                      },
                    }}
                  >
                    Documentation
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Background elements - decorative shapes */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(30, 99, 204, 0.3) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />
        
        {/* Additional decorative element */}
        <Box
          sx={{
            position: "absolute",
            bottom: -50,
            left: "10%",
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(255, 153, 0, 0.1) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />
      </Box>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Fast, secure, and at-scale. A developer portal to meet your Enterprise needs."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}