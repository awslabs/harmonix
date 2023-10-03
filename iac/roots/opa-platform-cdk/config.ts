export const params = {
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || "us-east-1",
  PREFIX: process.env.PREFIX || "opa",
  ALLOWED_IPS: process.env.ALLOWED_IPS || "0.0.0.0/0",
  CUSTOMER_NAME: process.env.CUSTOMER_NAME || "backstage-userr",
  GITLAB_AMI: process.env.GITLAB_AMI || "ami-0b5c4c03d885d8096",
  GITLAB_RUNNER_AMI: process.env.GITLAB_RUNNER_AMI || "ami-0557a15b87f6559cf",
  ROOT_DOMAIN: process.env.ROOT_DOMAIN || "viewbackstage.com",
  OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID,
  OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET,
  OKTA_AUDIENCE: process.env.OKTA_AUDIENCE || "https://dev-01290384.okta.com/",
  OKTA_AUTH_SERVER_ID: process.env.OKTA_AUTH_SERVER_ID || "",
  OKTA_IDP: process.env.OKTA_IDP || "",
  OKTA_API_TOKEN: process.env.OKTA_API_TOKEN,

  // ... any other parameters you might need.
};
