
# backstage-cli --version ;
cd backstage
# build the plugin packages and create dist folder ready for publication
yarn tsc
yarn build:all
cd plugins
npm version patch --workspaces
npm login
npm publish --workspaces
# --workspaces --dry-run
