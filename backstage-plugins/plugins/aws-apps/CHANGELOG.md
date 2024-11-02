# @aws/plugin-aws-apps-for-backstage

## 0.4.0

### Minor Changes

- b76307e: Implemented `@backstage/integration-aws-node` enabling reuse of credentials shared with other AWS integrated plugins (e.g. [Roadie](https://github.com/RoadieHQ/roadie-backstage-plugins/tree/main/plugins/backend/catalog-backend-module-aws), [AWS CodeStar](https://github.com/awslabs/backstage-plugins-for-aws)), and running Harmonix outside of an AWS account (Credits: @fjudith). Bump framework version 1.30.4, optimized code-style, and comply CI with [community-plugins](https://github.com/backstage/community-plugins) (Credits: @fleveillee).

### Patch Changes

- Updated dependencies [b76307e]
  - @aws/plugin-aws-apps-common-for-backstage@0.4.0

## 0.3.6

### Patch Changes

- 95c1ddb: Bump framework version 1.30.4 and aligned with `backstage/community-plugins` best practices
- Updated dependencies [95c1ddb]
  - @aws/plugin-aws-apps-common-for-backstage@0.3.5
