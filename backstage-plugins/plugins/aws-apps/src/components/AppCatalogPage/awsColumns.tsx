// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  humanizeEntityRef,
  EntityRefLink,
  EntityRefLinks,
} from '@backstage/plugin-catalog-react';
import { Chip } from '@material-ui/core';

import { OverflowTooltip, TableColumn } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { JsonArray } from '@backstage/types';
import { CatalogTableRow } from '@backstage/plugin-catalog';

// The columnFactories symbol is not directly exported, but through the
// CatalogTable.columns field.
/** @public */
export const columnFactories = Object.freeze({
  createNameColumn(options?: {
    defaultKind?: string;
  }): TableColumn<CatalogTableRow> {
    function formatContent(entity: Entity): string {
      return (
        entity.metadata?.title ||
        humanizeEntityRef(entity, {
          defaultKind: options?.defaultKind,
        })
      );
    }

    return {
      title: 'Name',
      field: 'resolved.entityRef',
      highlight: true,
      customSort({ entity: entity1 }, { entity: entity2 }) {
        // TODO: We could implement this more efficiently by comparing field by field.
        // This has similar issues as above.
        return formatContent(entity1).localeCompare(formatContent(entity2));
      },
      cellStyle: {
        minWidth:'175px'
      },
      render: ({ entity }) => (
        <EntityRefLink
          entityRef={entity}
          defaultKind={options?.defaultKind ?? 'Component'}
        />
      ),
      
    };
  },
  createSystemColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'System',
      field: 'resolved.partOfSystemRelationTitle',
      render: ({ resolved }) => (
        <EntityRefLinks
          entityRefs={resolved.partOfSystemRelations}
          defaultKind="system"
        />
      ),
      width:'auto'
    };
  },
  createOwnerColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Owner',
      field: 'resolved.ownedByRelationsTitle',
      cellStyle: {
        minWidth:'130px'
      },
      render: ({ resolved }) => (
        <EntityRefLinks
          entityRefs={resolved.ownedByRelations}
          defaultKind="group"
        />
      ),
    };
  },
  createSpecTargetsColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Targets',
      field: 'entity.spec.targets',
      render: ({ entity }) => (
        <>
          {(entity?.spec?.targets || entity?.spec?.target) && (
            <OverflowTooltip
              text={(
                (entity!.spec!.targets as JsonArray) || [entity.spec.target]
              ).join(', ')}
              placement="bottom-start"
            />
          )}
        </>
      ),
    };
  },
  createSpecTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Type',
      field: 'entity.spec.type',
      hidden: true,
      width: 'auto',
    };
  },
  createSpecLifecycleColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Lifecycle',
      field: 'entity.spec.lifecycle',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      width:'auto'
    };
  },
  createMetadataDescriptionColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Description',
      field: 'entity.metadata.description',
      cellStyle: {
        minWidth:'175px'
      },
      render: ({ entity }) => (
        <OverflowTooltip
          text={entity.metadata.description}
          placement="bottom-start"
        />
      ),
    
    };
  },
  createProviderAccountColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'AWS Account',
      field: 'entity.metadata["awsAccount"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
        minWidth:'150px'
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["awsAccount"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createProviderRegionColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'AWS Region',
      field: 'entity.metadata["awsRegion"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["awsRegion"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createProviderPrefixColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Prefix',
      field: 'entity.metadata["prefix"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["prefix"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createAWSResourceTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Resource Type',
      field: 'entity.metadata["resourceType"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
        minWidth:'30px'
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["resourceType"]?.toString() || ""
          }
        </>
      ),
      //width: 'auto',
      
    };
  },
  createIACColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'IAC',
      field: 'entity.metadata["iacType"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["iacType"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Type',
      field: 'entity.metadata["environmentType"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["environmentType"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentSystemColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'System',
      field: 'entity.spec["system"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.spec?.["system"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentCategoryColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Category',
      field: 'entity.metadata["category"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["category"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentClassificationColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Classification',
      field: 'entity.metadata["classification"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["classification"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentLevelColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Level',
      field: 'entity.metadata["level"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["level"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentAccountTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Account Type',
      field: 'entity.metadata["envTypeAccount"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["envTypeAccount"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createEnvironmentRegionTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Region Type',
      field: 'entity.metadata["envTypeRegion"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["envTypeRegion"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createProviderTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Provider Type',
      field: 'entity.metadata["envType"]',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {
            entity.metadata["envType"]?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createComponentSubTypeColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Sub Type',
      field: 'entity.spec.subType',
      cellStyle: {
        padding: '0px 16px 0px 20px',
        minWidth:'150px'
      },
      render: ({ entity }) => (
        <>
          {
            entity.spec?.subType?.toString() || ""
          }
        </>
      ),
      width: 'auto',
    };
  },
  createTagsColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Tags',
      field: 'entity.metadata.tags',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }) => (
        <>
          {entity.metadata.tags &&
            entity.metadata.tags.map(t => (
              <Chip
                key={t}
                label={t}
                size="small"
                variant="outlined"
                style={{ marginBottom: '0px' }}
              />
            ))}
        </>
      ),
      width: 'auto',
    };
  },
  createTitleColumn(options?: {
    hidden?: boolean;
  }): TableColumn<CatalogTableRow> {
    return {
      title: 'Title',
      field: 'entity.metadata.title',
      hidden: options?.hidden,
      searchable: true,
    };
  },
  createLabelColumn(
    key: string,
    options?: { title?: string; defaultValue?: string },
  ): TableColumn<CatalogTableRow> {
    return {
      title: options?.title ?? 'Label',
      field: 'entity.metadata.labels',
      cellStyle: {
        padding: '0px 16px 0px 20px',
      },
      render: ({ entity }: { entity: Entity }) => {
        const labels: Record<string, string> | undefined =
          entity.metadata?.labels;
        const specifiedLabelValue =
          (labels && labels[key]) || options?.defaultValue;
        return (
          <>
            {specifiedLabelValue && (
              <Chip
                key={specifiedLabelValue}
                label={specifiedLabelValue}
                size="small"
                variant="outlined"
              />
            )}
          </>
        );
      },
      width: 'auto',
    };
  },
  createNamespaceColumn(): TableColumn<CatalogTableRow> {
    return {
      title: 'Namespace',
      field: 'entity.metadata.namespace',
      width: 'auto',
    };
  },
});
