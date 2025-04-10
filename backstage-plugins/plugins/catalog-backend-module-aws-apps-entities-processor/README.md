## Configuration

```typescript
// packages/backend/index.ts
import AWSProcessor from '@aws/backstage-plugin-catalog-backend-module-aws-apps-entities-processor';
import {catalogPluginGitlabFillerProcessorModule, gitlabPlugin} from "@immobiliarelabs/backstage-plugin-gitlab-backend";
//...
backend.add(AWSProcessor);
backend.add(gitlabPlugin);
backend.add(catalogPluginGitlabFillerProcessorModule);
```