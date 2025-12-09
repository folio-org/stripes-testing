/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME, ITEM_STATUS_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByFindingSubfield,
  verify001FieldValue,
  verify005FieldValue,
  verifyLeaderPositions,
  verifyMarcFieldAbsence,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
let urlRelationshipId;
let instanceTypeId;
let mappingProfileId;
let jobProfileId;
const postfix = getRandomPostfix();
const recordsCount = 4;
const instanceUUIDsFileName = `AT_C468204_instanceUUIDs_${postfix}.csv`;
const customMappingProfileName = `AT_C468204_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C468204_CustomJobProfile_${postfix} export job profile`;

const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.uiInventoryViewCreateInstances.gui,
];

const instances = [
  {
    title: `AT_C468204_Shared_MARC_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: true,
  },
  {
    title: `AT_C468204_Shared_FOLIO_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: true,
  },
  {
    title: `AT_C468204_Local_MARC_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
    hasHoldings: true,
  },
  {
    title: `AT_C468204_Local_FOLIO_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
    hasHoldings: true,
  },
  {
    title: `AT_C468204_Shared_MARC_NoHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: false,
  },
  {
    title: `AT_C468204_Shared_FOLIO_NoHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: false,
  },
];

const createCustomMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
  transformations: [
    {
      fieldId: 'holdings.electronic.access.uri.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].uri`,
      recordType: 'HOLDINGS',
      transformation: '85640$u',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.linktext.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].linkText`,
      recordType: 'HOLDINGS',
      transformation: '85640$y',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.materialsspecification.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].materialsSpecification`,
      recordType: 'HOLDINGS',
      transformation: '85640$3',
      enabled: true,
    },
    {
      fieldId: 'holdings.electronic.access.publicnote.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].publicNote`,
      recordType: 'HOLDINGS',
      transformation: '85640$z',
      enabled: true,
    },
    {
      fieldId: 'holdings.hrid',
      path: '$.holdings[*].hrid',
      recordType: 'HOLDINGS',
      transformation: '901  $a',
      enabled: true,
    },
    {
      fieldId: 'holdings.id',
      path: '$.holdings[*].id',
      recordType: 'HOLDINGS',
      transformation: '901  $b',
      enabled: true,
    },
    {
      fieldId: 'item.barcode',
      path: '$.holdings[*].items[*].barcode',
      recordType: 'ITEM',
      transformation: '876  $a',
      enabled: true,
    },
    {
      fieldId: 'item.hrid',
      path: '$.holdings[*].items[*].hrid',
      recordType: 'ITEM',
      transformation: '902  $a',
      enabled: true,
    },
    {
      fieldId: 'item.id',
      path: '$.holdings[*].items[*].id',
      recordType: 'ITEM',
      transformation: '902  $b',
      enabled: true,
    },
  ],
});

function createInstance(instance) {
  cy.withinTenant(instance.affiliation, () => {
    if (instance.type === 'folio') {
      const instanceData = {
        title: instance.title,
        instanceTypeId,
      };

      InventoryInstances.createFolioInstanceViaApi({
        instance: instanceData,
      })
        .then((createdInstanceData) => {
          instance.uuid = createdInstanceData.instanceId;
          return cy.getInstanceById(instance.uuid);
        })
        .then((instanceDetails) => {
          instance.hrid = instanceDetails.hrid;
        });
    } else {
      cy.createSimpleMarcBibViaAPI(instance.title)
        .then((instanceId) => {
          instance.uuid = instanceId;
          return cy.getInstanceById(instanceId);
        })
        .then((instanceData) => {
          instance.hrid = instanceData.hrid;
          return cy.getSrsRecordsByInstanceId(instance.uuid);
        })
        .then((srsRecords) => {
          instance.srsId = srsRecords?.matchedId;
        });
    }
  });
}

function addHoldingsAndItems(instance, tenantAffiliation) {
  cy.withinTenant(tenantAffiliation, () => {
    let tenantLoanTypeId;
    let tenantMaterialTypeId;
    let tenantLocationId;
    let tenantLocationCode;
    let tenantHoldingTypeId;
    let tenantSourceId;

    cy.getLoanTypes({ limit: 1 }).then((res) => {
      tenantLoanTypeId = res[0].id;
    });
    cy.getMaterialTypes({ limit: 1 }).then((res) => {
      tenantMaterialTypeId = res.id;
    });
    cy.getLocations({ limit: 1 }).then((locations) => {
      tenantLocationId = locations.id;
      tenantLocationCode = locations.code;
    });
    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
      tenantHoldingTypeId = holdingTypes[0].id;
    });
    InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
      tenantSourceId = folioSource.id;
    });

    cy.then(() => {
      const electronicAccess = [
        {
          relationshipId: urlRelationshipId,
          uri: `https://example.com/${instance.title}`,
          linkText: `Link for ${instance.title}`,
          materialsSpecification: `Materials for ${instance.title}`,
          publicNote: `Public note for ${instance.title}`,
        },
      ];

      InventoryHoldings.createHoldingRecordViaApi({
        instanceId: instance.uuid,
        sourceId: tenantSourceId,
        holdingsTypeId: tenantHoldingTypeId,
        permanentLocationId: tenantLocationId,
        electronicAccess,
      }).then((holding) => {
        if (!instance.holdings) instance.holdings = [];
        instance.holdings.push({
          tenant: tenantAffiliation,
          id: holding.id,
          hrid: holding.hrid,
          electronicAccess,
          type: 'folio',
        });

        // Create MARC holdings for MARC instances
        if (instance.type === 'marc') {
          cy.createSimpleMarcHoldingsViaAPI(instance.uuid, instance.hrid, tenantLocationCode).then(
            (marcHoldingId) => {
              cy.getHoldings({ limit: 1, query: `"id"=="${marcHoldingId}"` }).then(
                (holdingsRecords) => {
                  const marcHoldingData = holdingsRecords[0];

                  instance.holdings.push({
                    tenant: tenantAffiliation,
                    id: marcHoldingId,
                    hrid: marcHoldingData.hrid,
                    type: 'marc',
                  });

                  // Add electronic access to MARC holdings
                  cy.getRecordDataInEditorViaApi(marcHoldingId).then((marcData) => {
                    marcData.fields.push({
                      tag: '856',
                      content: [
                        `$u ${electronicAccess[0].uri}`,
                        `$y ${electronicAccess[0].linkText}`,
                        `$3 ${electronicAccess[0].materialsSpecification}`,
                        `$z ${electronicAccess[0].publicNote}`,
                      ].join(' '),
                      indicators: ['4', '0'],
                    });
                    cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData);
                  });

                  // Create item for MARC holding
                  const marcItemBarcode = `BC_MARC_${instance.title}_${tenantAffiliation}_${getRandomPostfix()}`;
                  InventoryItems.createItemViaApi({
                    barcode: marcItemBarcode,
                    holdingsRecordId: marcHoldingId,
                    materialType: { id: tenantMaterialTypeId },
                    permanentLoanType: { id: tenantLoanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((marcItem) => {
                    if (!instance.items) instance.items = [];
                    instance.items.push({
                      tenant: tenantAffiliation,
                      id: marcItem.id,
                      hrid: marcItem.hrid,
                      barcode: marcItemBarcode,
                      holdingType: 'marc',
                    });
                  });
                },
              );
            },
          );
        }

        const itemBarcode = `BC_${instance.title}_${tenantAffiliation}_${getRandomPostfix()}`;

        InventoryItems.createItemViaApi({
          barcode: itemBarcode,
          holdingsRecordId: holding.id,
          materialType: { id: tenantMaterialTypeId },
          permanentLoanType: { id: tenantLoanTypeId },
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
        }).then((item) => {
          if (!instance.items) instance.items = [];
          instance.items.push({
            tenant: tenantAffiliation,
            id: item.id,
            hrid: item.hrid,
            barcode: itemBarcode,
            holdingType: 'folio',
          });
        });
      });
    });
  });
}

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [permissions.uiInventoryViewInstances.gui],
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: user.userId,
          permissions: [],
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        UrlRelationship.getViaApi().then((relationships) => {
          urlRelationshipId = relationships.find(
            (rel) => rel.name === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          )?.id;
        });

        cy.then(() => {
          instances.forEach((instance) => {
            createInstance(instance);
          });
        }).then(() => {
          instances
            .filter((instance) => instance.hasHoldings)
            .forEach((instance) => {
              // All instances with holdings get holdings/items in College (member-1)
              addHoldingsAndItems(instance, Affiliations.College);

              // Only shared instances get holdings/items in University (member-2) and School (member-3)
              if (instance.affiliation === Affiliations.Consortia) {
                addHoldingsAndItems(instance, Affiliations.University);
                addHoldingsAndItems(instance, Affiliations.School);
              }
            });
        });

        cy.then(() => {
          const customMappingProfile = createCustomMappingProfile(urlRelationshipId);

          cy.createDataExportCustomMappingProfile(customMappingProfile).then((resp) => {
            mappingProfileId = resp.id;

            ExportNewJobProfile.createNewJobProfileViaApi(customJobProfileName, resp.id).then(
              (jobResp) => {
                jobProfileId = jobResp.body.id;
              },
            );
          });

          const sharedInstanceUUIDs = instances
            .filter((inst) => inst.affiliation === Affiliations.Consortia)
            .map((inst) => inst.uuid);
          const localInstanceUUIDs = instances
            .filter((inst) => inst.affiliation === Affiliations.College)
            .map((inst) => inst.uuid);

          const csvContent = [
            ...sharedInstanceUUIDs,
            ...sharedInstanceUUIDs,
            ...localInstanceUUIDs,
            ...localInstanceUUIDs,
          ].join('\n');

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, csvContent);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.withinTenant(Affiliations.College, () => {
        instances
          .filter((instance) => instance.hasHoldings)
          .forEach((instance) => {
            instance.items?.forEach((item) => {
              if (item.tenant === Affiliations.College) {
                cy.deleteItemViaApi(item.id);
              }
            });
            instance.holdings?.forEach((holding) => {
              if (holding.tenant === Affiliations.College) {
                cy.deleteHoldingRecordViaApi(holding.id);
              }
            });
          });

        instances
          .filter((instance) => instance.affiliation === Affiliations.College)
          .forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
      });

      cy.withinTenant(Affiliations.University, () => {
        instances
          .filter((instance) => instance.hasHoldings)
          .forEach((instance) => {
            instance.items?.forEach((item) => {
              if (item.tenant === Affiliations.University) {
                cy.deleteItemViaApi(item.id);
              }
            });
            instance.holdings?.forEach((holding) => {
              if (holding.tenant === Affiliations.University) {
                cy.deleteHoldingRecordViaApi(holding.id);
              }
            });
          });
      });

      cy.withinTenant(Affiliations.School, () => {
        instances
          .filter(
            (instance) => instance.hasHoldings && instance.affiliation === Affiliations.Consortia,
          )
          .forEach((instance) => {
            instance.items?.forEach((item) => {
              if (item.tenant === Affiliations.School) {
                cy.deleteItemViaApi(item.id);
              }
            });
            instance.holdings?.forEach((holding) => {
              if (holding.tenant === Affiliations.School) {
                cy.deleteHoldingRecordViaApi(holding.id);
              }
            });
          });
      });

      cy.withinTenant(Affiliations.Consortia, () => {
        instances
          .filter((instance) => instance.affiliation === Affiliations.Consortia)
          .forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
      });

      ExportJobProfiles.deleteJobProfileViaApi(jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(mappingProfileId);

      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
    });

    it(
      'C468204 ECS | Export Instances from Central tenant with custom SRS & Holdings & Item profile (file with Instances UUIDs) (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C468204'] },
      () => {
        // Step 1: Upload .csv file with Instances UUIDs
        ExportFile.uploadFile(instanceUUIDsFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run Custom job profile > Specify "Instance" type > Click "Run"
        ExportFile.exportWithDefaultJobProfile(
          instanceUUIDsFileName,
          `AT_C468204_CustomJobProfile_${postfix}`,
          'Instances',
        );

        // Step 3: Check data export logs table
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            exportedFileName,
            12,
            recordsCount,
            jobId,
            user,
            `AT_C468204_CustomJobProfile_${postfix}`,
          );

          // Step 4: Download created file
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5-6: Verify exported .mrc file content - only shared records with College tenant holdings/items
          const sharedInstances = instances.filter(
            (inst) => inst.affiliation === Affiliations.Consortia,
          );
          const localInstanceUUIDs = instances
            .filter((inst) => inst.affiliation === Affiliations.College)
            .map((inst) => inst.uuid);

          // Collect holdings/items from University (member-2) and School (member-3) that should NOT be exported
          const universityHoldingsItems = [];
          const schoolHoldingsItems = [];

          instances
            .filter((inst) => inst.hasHoldings)
            .forEach((instance) => {
              instance.holdings?.forEach((holding) => {
                if (holding.tenant === Affiliations.University) {
                  universityHoldingsItems.push(holding.hrid, holding.id);
                }
                if (holding.tenant === Affiliations.School) {
                  schoolHoldingsItems.push(holding.hrid, holding.id);
                }
              });
              instance.items?.forEach((item) => {
                if (item.tenant === Affiliations.University) {
                  universityHoldingsItems.push(item.hrid, item.id, item.barcode);
                }
                if (item.tenant === Affiliations.School) {
                  schoolHoldingsItems.push(item.hrid, item.id, item.barcode);
                }
              });
            });

          ExportFile.verifyFileIncludes(
            exportedFileName,
            [...localInstanceUUIDs, ...universityHoldingsItems, ...schoolHoldingsItems],
            false,
          );

          // Instance 1: Shared MARC with holdings - 2 holdings (FOLIO + MARC), 2 items
          const instance1 = sharedInstances.find(
            (inst) => inst.type === 'marc' && inst.hasHoldings,
          );
          const instance1FolioHolding = instance1.holdings?.find(
            (h) => h.tenant === Affiliations.College && h.type === 'folio',
          );
          const instance1MarcHolding = instance1.holdings?.find(
            (h) => h.tenant === Affiliations.College && h.type === 'marc',
          );
          const instance1FolioItem = instance1.items?.find(
            (i) => i.tenant === Affiliations.College && i.holdingType === 'folio',
          );
          const instance1MarcItem = instance1.items?.find(
            (i) => i.tenant === Affiliations.College && i.holdingType === 'marc',
          );

          // Instance 2: Shared FOLIO with holdings - 1 FOLIO holding, 1 item
          const instance2 = sharedInstances.find(
            (inst) => inst.type === 'folio' && inst.hasHoldings,
          );
          const instance2Holding = instance2.holdings?.find(
            (h) => h.tenant === Affiliations.College,
          );
          const instance2Item = instance2.items?.find((i) => i.tenant === Affiliations.College);

          // Instance 3: Shared MARC without holdings
          const instance3 = sharedInstances.find(
            (inst) => inst.type === 'marc' && !inst.hasHoldings,
          );

          // Instance 4: Shared FOLIO without holdings
          const instance4 = sharedInstances.find(
            (inst) => inst.type === 'folio' && !inst.hasHoldings,
          );

          const recordsToVerify = [
            {
              uuid: instance1.uuid,
              assertions: [
                (record) => verify001FieldValue(record, instance1.hrid),
                (record) => verify005FieldValue(record),
                (record) => {
                  verifyMarcFieldByTag(record, '245', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: ['a', instance1.title],
                  });
                },
                // Two 856 fields - one from FOLIO holding, one from MARC holding
                (record) => {
                  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '856', {
                    ind1: '4',
                    ind2: '0',
                    expectedCount: 2,
                    subfields: [
                      ['u', instance1FolioHolding.electronicAccess[0].uri],
                      ['y', instance1FolioHolding.electronicAccess[0].linkText],
                      ['3', instance1FolioHolding.electronicAccess[0].materialsSpecification],
                      ['z', instance1FolioHolding.electronicAccess[0].publicNote],
                    ],
                  });
                },
                // Two 876 fields - one for each item
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '876', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1FolioItem.barcode,
                    subfields: [
                      ['a', instance1FolioItem.barcode],
                      ['3', instance1FolioHolding.hrid],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '876', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1MarcItem.barcode,
                    subfields: [
                      ['a', instance1MarcItem.barcode],
                      ['3', instance1MarcHolding.hrid],
                    ],
                  });
                },
                // Two 901 fields - one for each holding
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '901', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1FolioHolding.hrid,
                    subfields: [
                      ['a', instance1FolioHolding.hrid],
                      ['b', instance1FolioHolding.id],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '901', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1MarcHolding.hrid,
                    subfields: [
                      ['a', instance1MarcHolding.hrid],
                      ['b', instance1MarcHolding.id],
                    ],
                  });
                },
                // Two 902 fields - one for each item
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '902', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1FolioItem.hrid,
                    subfields: [
                      ['a', instance1FolioItem.hrid],
                      ['b', instance1FolioItem.id],
                      ['3', instance1FolioHolding.hrid],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByFindingSubfield(record, '902', {
                    ind1: ' ',
                    ind2: ' ',
                    findBySubfield: 'a',
                    findByValue: instance1MarcItem.hrid,
                    subfields: [
                      ['a', instance1MarcItem.hrid],
                      ['b', instance1MarcItem.id],
                      ['3', instance1MarcHolding.hrid],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: [
                      ['i', instance1.uuid],
                      ['s', instance1.srsId],
                    ],
                  });
                },
              ],
            },
            {
              uuid: instance2.uuid,
              assertions: [
                (record) => {
                  verifyLeaderPositions(record, {
                    5: 'n',
                    6: 'a',
                    7: 'm',
                  });
                },
                (record) => verify001FieldValue(record, instance2.hrid),
                (record) => verify005FieldValue(record),
                (record) => {
                  verifyMarcFieldByTag(record, '245', {
                    ind1: '0',
                    ind2: '0',
                    subfields: ['a', instance2.title],
                  });
                },
                // One 856 field from FOLIO holding
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '856', {
                    ind1: '4',
                    ind2: '0',
                    subfields: [
                      ['u', instance2Holding.electronicAccess[0].uri],
                      ['y', instance2Holding.electronicAccess[0].linkText],
                      ['z', instance2Holding.electronicAccess[0].publicNote],
                      ['3', instance2Holding.electronicAccess[0].materialsSpecification],
                    ],
                  });
                },
                // One 876 field for item
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '876', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: [
                      ['a', instance2Item.barcode],
                      ['3', instance2Holding.hrid],
                    ],
                  });
                },
                // One 901 field for holding
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: [
                      ['a', instance2Holding.hrid],
                      ['b', instance2Holding.id],
                    ],
                  });
                },
                // One 902 field for item
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: [
                      ['a', instance2Item.hrid],
                      ['b', instance2Item.id],
                      ['3', instance2Holding.hrid],
                    ],
                  });
                },
                (record) => {
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: ['i', instance2.uuid],
                  });
                },
              ],
            },
            {
              uuid: instance3.uuid,
              assertions: [
                (record) => verify001FieldValue(record, instance3.hrid),
                (record) => verify005FieldValue(record),
                (record) => {
                  verifyMarcFieldByTag(record, '245', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: ['a', instance3.title],
                  });
                },
                (record) => {
                  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: [
                      ['i', instance3.uuid],
                      ['s', instance3.srsId],
                    ],
                  });
                },
                // No holdings/items fields
                (record) => verifyMarcFieldAbsence(record, '856'),
                (record) => verifyMarcFieldAbsence(record, '876'),
                (record) => verifyMarcFieldAbsence(record, '901'),
                (record) => verifyMarcFieldAbsence(record, '902'),
              ],
            },
            {
              uuid: instance4.uuid,
              assertions: [
                (record) => {
                  verifyLeaderPositions(record, {
                    5: 'n',
                    6: 'a',
                    7: 'm',
                  });
                },
                (record) => verify001FieldValue(record, instance4.hrid),
                (record) => verify005FieldValue(record),
                (record) => {
                  verifyMarcFieldByTag(record, '245', {
                    ind1: '0',
                    ind2: '0',
                    subfields: ['a', instance4.title],
                  });
                },
                (record) => {
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: ['i', instance4.uuid],
                  });
                },
                // No holdings/items fields
                (record) => verifyMarcFieldAbsence(record, '856'),
                (record) => verifyMarcFieldAbsence(record, '876'),
                (record) => verifyMarcFieldAbsence(record, '901'),
                (record) => verifyMarcFieldAbsence(record, '902'),
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);

          // Step 7: Click export job row
          DataExportLogs.clickFileNameFromTheList(exportedFileName);

          // Step 8-11: Verify error messages
          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          // Step 8: Verify error for missed affiliation (School tenant - member-3)
          sharedInstances
            .filter((inst) => inst.hasHoldings)
            .forEach((instance) => {
              DataExportLogs.verifyErrorTextInErrorLogsPane(
                new RegExp(
                  `${formattedDateUpToHours}.*ERROR ${instance.uuid} - the user ${user.username} is not affiliated with ${Affiliations.School} data tenant\\(s\\) and holdings and item records from this tenant were omitted during export\\.`,
                ),
              );
            });

          // Step 9: Verify error for missed permissions (University tenant)
          sharedInstances
            .filter((inst) => inst.hasHoldings)
            .forEach((instance) => {
              DataExportLogs.verifyErrorTextInErrorLogsPane(
                new RegExp(
                  `${formattedDateUpToHours}.*ERROR ${instance.uuid} - the user ${user.username} does not have permissions to view holdings or items in ${Affiliations.University} data tenant\\(s\\)\\. Holdings and item records from this tenant were omitted during export`,
                ),
              );
            });

          // Step 10: Verify repeated UUIDs errors
          const sharedInstancesUUIDs = sharedInstances.map((inst) => inst.uuid);
          [...sharedInstancesUUIDs, ...localInstanceUUIDs].forEach((uuid) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(`${formattedDateUpToHours}.*ERROR UUID ${uuid} repeated 2 times.`),
            );
          });

          // Step 11: Verify "Record not found" error for local records
          const regexParts = localInstanceUUIDs.map(
            (notFoundInstanceUUID) => `(?=.*${notFoundInstanceUUID})`,
          );
          const regexPattern = `${formattedDateUpToHours}.*ERROR Record not found: ${regexParts.join('')}`;
          const regex = new RegExp(regexPattern);

          DataExportLogs.verifyErrorTextInErrorLogsPane(regex);

          const totalErrorLinesNumber = 12;

          DataExportLogs.verifyTotalErrorLinesCount(totalErrorLinesNumber);
        });
      },
    );
  });
});
