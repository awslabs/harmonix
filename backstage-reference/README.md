File structure:

backstage-config/
├── boilerplates/
│   ├── boilerplate1/
│   │   ├── buildspec.yaml
│   │   └── iiac/
│   │       └── ...
│   └── boilerplate2/
│       ├── buildspec.yaml
│       └── cloudformation.yaml
└── templates/
    └── baws-ecs-application-template/
        ├── template.yaml
        └── additional-code/
            └── ...