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
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyLeaderPositions,
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verifyMarcFieldByFindingSubfield,
  verifyMarcFieldsWithIdenticalTagsAndSubfieldValues,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
let urlRelationshipId;
let instanceTypeId;
let mappingProfileId;
let jobProfileId;
let consortiaId;
const postfix = getRandomPostfix();
const recordsCount = 7;
const exportedRecordsCount = 5;
const instanceUUIDsFileName = `AT_C468212_instanceUUIDs_${postfix}.csv`;
const customMappingProfileName = `AT_C468212_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C468212_CustomJobProfile_${postfix} export job profile`;
const instances = [
  {
    title: `AT_C468212_Shared_Central_MARC_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: true,
    source: 'central',
  },
  {
    title: `AT_C468212_Shared_Central_MARC_Deleted_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'marc',
    hasHoldings: true,
    source: 'central',
    deleted: true,
  },
  {
    title: `AT_C468212_Shared_Central_FOLIO_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.Consortia,
    type: 'folio',
    hasHoldings: true,
    source: 'central',
  },
  {
    title: `AT_C468212_Shared_Member_MARC_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
    hasHoldings: true,
    source: 'member',
  },
  {
    title: `AT_C468212_Shared_Member_FOLIO_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
    hasHoldings: true,
    source: 'member',
  },
  {
    title: `AT_C468212_Local_MARC_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'marc',
    hasHoldings: true,
    source: 'local',
    local: true,
  },
  {
    title: `AT_C468212_Local_FOLIO_WithHoldings_${getRandomPostfix()}`,
    affiliation: Affiliations.College,
    type: 'folio',
    hasHoldings: true,
    source: 'local',
    local: true,
  },
];

const createCustomMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
  transformations: [
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
      fieldId: 'holdings.electronic.access.uri.resource',
      path: `$.holdings[*].electronicAccess[?(@.relationshipId=='${relationshipId}')].uri`,
      recordType: 'HOLDINGS',
      transformation: '85640$u',
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
      fieldId: 'holdings.instanceid',
      path: '$.holdings[*].instanceId',
      recordType: 'HOLDINGS',
      transformation: '999ff$i',
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
      // Create MARC instance
      cy.createSimpleMarcBibViaAPI(instance.title)
        .then((instanceId) => {
          instance.uuid = instanceId;

          return cy.getInstanceById(instanceId);
        })
        .then((instanceData) => {
          instance.hrid = instanceData.hrid;
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
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [permissions.uiInventoryViewInstances.gui],
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });

          UrlRelationship.getViaApi().then((relationships) => {
            urlRelationshipId = relationships.find(
              (rel) => rel.name === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            )?.id;
          });

          cy.getConsortiaId().then((conId) => {
            consortiaId = conId;
          });

          cy.then(() => {
            instances.forEach((instance) => {
              createInstance(instance);
            });
          })
            .then(() => {
              cy.withinTenant(Affiliations.College, () => {
                // Share member instances to central tenant
                const memberInstances = instances.filter((inst) => inst.source === 'member');

                memberInstances.forEach((instance) => {
                  InventoryInstance.shareInstanceViaApi(
                    instance.uuid,
                    consortiaId,
                    Affiliations.College,
                    Affiliations.Consortia,
                  );
                  cy.getInstanceById(instance.uuid).then((instanceData) => {
                    instance.hrid = instanceData.hrid;
                  });
                });
              });
            })

            .then(() => {
              instances.forEach((instance) => {
                if (instance.hasHoldings) {
                  addHoldingsAndItems(instance, Affiliations.College);
                }
              });
            })
            .then(() => {
              // Mark one instance as deleted
              const deletedInstance = instances.find((inst) => inst.deleted);
              if (deletedInstance) {
                cy.withinTenant(deletedInstance.affiliation, () => {
                  InstanceRecordView.markAsDeletedViaApi(deletedInstance.uuid);
                });
              }

              const customMappingProfile = createCustomMappingProfile(urlRelationshipId);

              cy.createDataExportCustomMappingProfile(customMappingProfile).then((resp) => {
                mappingProfileId = resp.id;

                ExportNewJobProfile.createNewJobProfileViaApi(customJobProfileName, resp.id).then(
                  (jobResp) => {
                    jobProfileId = jobResp.body.id;
                  },
                );
              });

              const instanceUUIDs = instances.map((inst) => inst.uuid);
              const csvContent = instanceUUIDs.join('\n');

              FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, csvContent);
            });

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        },
      );
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.withinTenant(Affiliations.College, () => {
        instances.forEach((instance) => {
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
      });

      cy.withinTenant(Affiliations.Consortia, () => {
        instances.forEach((instance) => {
          // Delete instances that were created in or shared to central
          if (instance.affiliation === Affiliations.Consortia || instance.source === 'member') {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          }
        });
      });

      cy.withinTenant(Affiliations.College, () => {
        instances.forEach((instance) => {
          // Delete local instances and member-created instances
          if (instance.local || instance.source === 'member') {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          }
        });
      });

      ExportJobProfiles.deleteJobProfileViaApi(jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(mappingProfileId);

      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
    });

    it(
      'C468212 ECS | Export from Central tenant with custom Holdings & Item profile (file with Instances UUIDs) (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C468212'] },
      () => {
        // Step 1: Upload .csv file with Instances UUIDs
        ExportFile.uploadFile(instanceUUIDsFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run Custom job profile > Specify "Instances" type > Click "Run"
        ExportFile.exportWithDefaultJobProfile(
          instanceUUIDsFileName,
          `AT_C468212_CustomJobProfile_${postfix}`,
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
            recordsCount,
            exportedRecordsCount,
            jobId,
            user,
            `AT_C468212_CustomJobProfile_${postfix}`,
          );

          // Step 4: Download created file
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 5: Verify exported records - only shared instances
          const sharedInstances = instances.filter((inst) => !inst.local);

          const getFolioInstanceAssertions = (instance) => {
            const holding = instance.holdings.find(
              (h) => h.tenant === Affiliations.College && h.type === 'folio',
            );
            const item = instance.items.find(
              (i) => i.tenant === Affiliations.College && i.holdingType === 'folio',
            );
            const electronicAccess = holding.electronicAccess[0];

            return [
              (record) => {
                verifyLeaderPositions(record, {
                  5: 'n',
                  6: 'a',
                  7: 'm',
                });
              },
              // Verify 856 field (Holdings electronic access)
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '856', {
                  ind1: '4',
                  ind2: '0',
                  subfields: [
                    ['u', electronicAccess.uri],
                    ['y', electronicAccess.linkText],
                    ['z', electronicAccess.publicNote],
                    ['3', electronicAccess.materialsSpecification],
                  ],
                });
              },
              // Verify 876 field (Item barcode)
              (record) => {
                verifyMarcFieldByTag(record, '876', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', item.barcode],
                    ['3', holding.hrid],
                  ],
                });
              },
              // Verify 901 field (Holdings HRID and ID)
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', holding.hrid],
                    ['b', holding.id],
                  ],
                });
              },
              // Verify 902 field (Item HRID and ID)
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', item.hrid],
                    ['b', item.id],
                    ['3', holding.hrid],
                  ],
                });
              },
              // Verify 999 ff $i field (Holdings Instance ID)
              (record) => {
                verifyMarcFieldByTag(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: [['i', instance.uuid]],
                });
              },
            ];
          };

          const getMarcInstanceAssertions = (instance) => {
            const folioHolding = instance.holdings.find(
              (h) => h.tenant === Affiliations.College && h.type === 'folio',
            );
            const marcHolding = instance.holdings.find(
              (h) => h.tenant === Affiliations.College && h.type === 'marc',
            );
            const folioItem = instance.items.find(
              (i) => i.tenant === Affiliations.College && i.holdingType === 'folio',
            );
            const marcItem = instance.items.find(
              (i) => i.tenant === Affiliations.College && i.holdingType === 'marc',
            );
            const electronicAccess = folioHolding.electronicAccess[0];

            return [
              // Verify 856 fields (Holdings electronic access) - 2 holdings
              (record) => {
                verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '856', {
                  ind1: '4',
                  ind2: '0',
                  expectedCount: 2,
                  subfields: [
                    ['u', electronicAccess.uri],
                    ['y', electronicAccess.linkText],
                    ['3', electronicAccess.materialsSpecification],
                    ['z', electronicAccess.publicNote],
                  ],
                });
              },
              // Verify 876 fields (Item barcode) - 2 items
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '876', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: folioItem.barcode,
                  subfields: [
                    ['a', folioItem.barcode],
                    ['3', folioHolding.hrid],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '876', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: marcItem.barcode,
                  subfields: [
                    ['a', marcItem.barcode],
                    ['3', marcHolding.hrid],
                  ],
                });
              },
              // Verify 901 fields (Holdings HRID and ID) - 2 holdings
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '901', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: folioHolding.hrid,
                  subfields: [
                    ['a', folioHolding.hrid],
                    ['b', folioHolding.id],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '901', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: marcHolding.hrid,
                  subfields: [
                    ['a', marcHolding.hrid],
                    ['b', marcHolding.id],
                  ],
                });
              },
              // Verify 902 fields (Item HRID and ID) - 2 items
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '902', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: folioItem.hrid,
                  subfields: [
                    ['a', folioItem.hrid],
                    ['b', folioItem.id],
                    ['3', folioHolding.hrid],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByFindingSubfield(record, '902', {
                  ind1: ' ',
                  ind2: ' ',
                  findBySubfield: 'a',
                  findByValue: marcItem.hrid,
                  subfields: [
                    ['a', marcItem.hrid],
                    ['b', marcItem.id],
                    ['3', marcHolding.hrid],
                  ],
                });
              },
              // Verify 999 ff $i fields (Holdings Instance ID) - 2 holdings
              (record) => {
                verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  expectedCount: 2,
                  subfields: [['i', instance.uuid]],
                });
              },
            ];
          };

          const recordsToVerify = sharedInstances.map((instance) => ({
            uuid: instance.uuid,
            assertions:
              instance.type === 'folio'
                ? getFolioInstanceAssertions(instance)
                : getMarcInstanceAssertions(instance),
          }));

          // Verify local instance UUIDs are absent from the file
          const localInstances = instances.filter((inst) => inst.local);
          const localUUIDs = localInstances.map((inst) => inst.uuid);

          ExportFile.verifyFileIncludes(exportedFileName, localUUIDs, false);

          // Step 6: Verify records are well formatted with holdings and items
          parseMrcFileContentAndVerify(
            exportedFileName,
            recordsToVerify,
            exportedRecordsCount,
            false,
          );

          // Step 7: Click export job row
          DataExportLogs.clickFileNameFromTheList(exportedFileName);

          // Step 8: Verify error for local instances not found
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`ERROR Record not found: (${localUUIDs.join('|')})`),
          );

          const totalErrorLinesNumber = 2;

          DataExportLogs.verifyTotalErrorLinesCount(totalErrorLinesNumber);
        });
      },
    );
  });
});
