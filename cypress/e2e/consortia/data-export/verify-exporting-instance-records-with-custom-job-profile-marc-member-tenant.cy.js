/* eslint-disable no-unused-expressions */
import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportViewAllLogs from '../../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES, ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let user;
const randomPostfix = getRandomPostfix();
const instancesUUIDsFileName = `AT_C405557_instances_${randomPostfix}.csv`;
const mappingProfileName = `AT_C405557_MappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C405557_JobProfile_${randomPostfix} export job profile`;
const localMarcInstanceTitle = `AT_C405557_LocalMarcInstance_${randomPostfix}`;
const sharedMarcInstanceTitle = `AT_C405557_SharedMarcInstance_${randomPostfix}`;
const testData = {
  instances: {
    localMarc: { folioHoldings: {}, marcHoldings: {}, items: {} },
    sharedMarc: { folioHoldings: {}, marcHoldings: {}, items: {} },
  },
  allUUIDs: [],
  electronicAccess: {
    localMarc: {
      uri: 'https://example.com/local',
      linkText: 'Local MARC Link',
      materialsSpecification: 'Local Materials',
      publicNote: 'Local Public Note',
    },
    sharedMarc: {
      uri: 'https://example.com/shared',
      linkText: 'Shared MARC Link',
      materialsSpecification: 'Shared Materials',
      publicNote: 'Shared Public Note',
    },
  },
};

const createMappingProfile = (relationshipId) => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  name: mappingProfileName,
  fieldsSuppression: '',
  suppress999ff: false,
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

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryViewCreateEditHoldings.gui,
          ],
        });

        cy.setTenant(Affiliations.College);
        UrlRelationship.getViaApi({
          query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
        }).then((relationships) => {
          testData.resourceRelationshipId = relationships[0].id;
        });
        cy.getLocations({ limit: 1 }).then((loc) => {
          testData.locationId = loc.id;
          testData.locationCode = loc.code;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((material) => {
          testData.materialTypeId = material.id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });

        // Create shared MARC instance in Central tenant
        cy.resetTenant();
        cy.createSimpleMarcBibViaAPI(sharedMarcInstanceTitle).then((instanceId) => {
          testData.instances.sharedMarc.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.instances.sharedMarc.hrid = instanceData.hrid;
          });
        });

        // Create local MARC instance and holdings/items in member tenant (College)
        cy.setTenant(Affiliations.College);
        cy.createSimpleMarcBibViaAPI(localMarcInstanceTitle)
          .then((instanceId) => {
            testData.instances.localMarc.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              testData.instances.localMarc.hrid = instanceData.hrid;

              // Create FOLIO holdings
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                sourceId: testData.sourceId,
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
                callNumber: `AT_C405557_LocalFolio_CN_${randomPostfix}`,
                electronicAccess: [
                  {
                    relationshipId: testData.resourceRelationshipId,
                    uri: testData.electronicAccess.localMarc.uri,
                    linkText: testData.electronicAccess.localMarc.linkText,
                    materialsSpecification:
                      testData.electronicAccess.localMarc.materialsSpecification,
                    publicNote: testData.electronicAccess.localMarc.publicNote,
                  },
                ],
              }).then((folioHolding) => {
                testData.instances.localMarc.folioHoldings.id = folioHolding.id;

                cy.getHoldings({ limit: 1, query: `"id"=="${folioHolding.id}"` }).then(
                  (holdings) => {
                    testData.instances.localMarc.folioHoldings.hrid = holdings[0].hrid;

                    InventoryItems.createItemViaApi({
                      barcode: `AT_C405557_LocalFolio_${randomPostfix}`,
                      holdingsRecordId: folioHolding.id,
                      materialType: { id: testData.materialTypeId },
                      permanentLoanType: { id: testData.loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      testData.instances.localMarc.items.folioItemId = item.id;
                      testData.instances.localMarc.items.folioItemHrid = item.hrid;
                      testData.instances.localMarc.items.folioItemBarcode = item.barcode;
                    });
                  },
                );
              });

              // Create MARC holdings
              cy.createSimpleMarcHoldingsViaAPI(
                instanceId,
                testData.instances.localMarc.hrid,
                testData.locationCode,
              ).then((holdingId) => {
                testData.instances.localMarc.marcHoldings.id = holdingId;

                cy.getHoldings({ limit: 1, query: `"id"=="${holdingId}"` }).then((holdings) => {
                  testData.instances.localMarc.marcHoldings.hrid = holdings[0].hrid;

                  // Add electronic access to MARC holdings
                  cy.getRecordDataInEditorViaApi(holdingId).then((marcData) => {
                    marcData.relatedRecordVersion = 1;
                    marcData.fields.push({
                      tag: '856',
                      content: [
                        `$u ${testData.electronicAccess.localMarc.uri}`,
                        `$y ${testData.electronicAccess.localMarc.linkText}`,
                        `$3 ${testData.electronicAccess.localMarc.materialsSpecification}`,
                        `$z ${testData.electronicAccess.localMarc.publicNote}`,
                      ].join(' '),
                      indicators: ['4', '0'],
                    });
                    cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData);
                  });

                  InventoryItems.createItemViaApi({
                    barcode: `AT_C405557_LocalMarc_${randomPostfix}`,
                    holdingsRecordId: holdingId,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    testData.instances.localMarc.items.marcItemId = item.id;
                    testData.instances.localMarc.items.marcItemHrid = item.hrid;
                    testData.instances.localMarc.items.marcItemBarcode = item.barcode;
                  });
                });
              });
            });
          })
          .then(() => {
            // Add holdings and items to shared instance in member tenant
            // Create FOLIO holdings
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instances.sharedMarc.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
              callNumber: `AT_C405557_SharedFolio_CN_${randomPostfix}`,
              electronicAccess: [
                {
                  relationshipId: testData.resourceRelationshipId,
                  uri: testData.electronicAccess.sharedMarc.uri,
                  linkText: testData.electronicAccess.sharedMarc.linkText,
                  materialsSpecification:
                    testData.electronicAccess.sharedMarc.materialsSpecification,
                  publicNote: testData.electronicAccess.sharedMarc.publicNote,
                },
              ],
            }).then((folioHolding) => {
              testData.instances.sharedMarc.folioHoldings.id = folioHolding.id;

              cy.getHoldings({
                limit: 1,
                query: `"id"=="${folioHolding.id}"`,
              }).then((holdings) => {
                testData.instances.sharedMarc.folioHoldings.hrid = holdings[0].hrid;

                InventoryItems.createItemViaApi({
                  barcode: `AT_C405557_SharedFolio_${randomPostfix}`,
                  holdingsRecordId: folioHolding.id,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.instances.sharedMarc.items.folioItemId = item.id;
                  testData.instances.sharedMarc.items.folioItemHrid = item.hrid;
                  testData.instances.sharedMarc.items.folioItemBarcode = item.barcode;
                });
              });
            });

            // Create MARC holdings
            cy.createSimpleMarcHoldingsViaAPI(
              testData.instances.sharedMarc.uuid,
              testData.instances.sharedMarc.hrid,
              testData.locationCode,
            ).then((holdingId) => {
              testData.instances.sharedMarc.marcHoldings.id = holdingId;

              cy.getHoldings({ limit: 1, query: `"id"=="${holdingId}"` }).then((holdings) => {
                testData.instances.sharedMarc.marcHoldings.hrid = holdings[0].hrid;

                // Add electronic access to MARC holdings
                cy.getRecordDataInEditorViaApi(holdingId).then((marcData) => {
                  marcData.relatedRecordVersion = 1;
                  marcData.fields.push({
                    tag: '856',
                    content: [
                      `$u ${testData.electronicAccess.sharedMarc.uri}`,
                      `$y ${testData.electronicAccess.sharedMarc.linkText}`,
                      `$3 ${testData.electronicAccess.sharedMarc.materialsSpecification}`,
                      `$z ${testData.electronicAccess.sharedMarc.publicNote}`,
                    ].join(' '),
                    indicators: ['4', '0'],
                  });
                  cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData);
                });

                InventoryItems.createItemViaApi({
                  barcode: `AT_C405557_SharedMarc_${randomPostfix}`,
                  holdingsRecordId: holdingId,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.instances.sharedMarc.items.marcItemId = item.id;
                  testData.instances.sharedMarc.items.marcItemHrid = item.hrid;
                  testData.instances.sharedMarc.items.marcItemBarcode = item.barcode;
                });
              });
            });
          })
          .then(() => {
            const mappingProfile = createMappingProfile(testData.resourceRelationshipId);

            cy.createDataExportCustomMappingProfile(mappingProfile).then((resp) => {
              testData.mappingProfileId = resp.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                jobProfileName,
                testData.mappingProfileId,
              ).then((jobResp) => {
                testData.jobProfileId = jobResp.body.id;
              });
            });
          })
          .then(() => {
            testData.allUUIDs = [
              testData.instances.localMarc.uuid,
              testData.instances.sharedMarc.uuid,
            ];

            FileManager.createFile(
              `cypress/fixtures/${instancesUUIDsFileName}`,
              testData.allUUIDs.join('\n'),
            );
          });
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.instances.localMarc.uuid,
      );

      [
        testData.instances.sharedMarc.items.folioItemId,
        testData.instances.sharedMarc.items.marcItemId,
      ].forEach((itemId) => cy.deleteItemViaApi(itemId));
      [
        testData.instances.sharedMarc.folioHoldings.id,
        testData.instances.sharedMarc.marcHoldings.id,
      ].forEach((holdingId) => cy.deleteHoldingRecordViaApi(holdingId));

      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      cy.resetTenant();
      InventoryInstance.deleteInstanceViaApi(testData.instances.sharedMarc.uuid);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instancesUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C405557 Consortia | Verify exporting instance records with Custom job profile MARC - member tenant (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C405557'] },
      () => {
        // Step 1: Go to the "Data export" app
        DataExportViewAllLogs.verifyLogsTable();

        // Step 2: Trigger the data export by submitting .csv file with Instances UUIDs
        ExportFile.uploadFile(instancesUUIDsFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 3: Run the customized export job profile > Specify "Instance" type > Click "Run"
        ExportFile.exportWithDefaultJobProfile(
          instancesUUIDsFileName,
          `AT_C405557_JobProfile_${randomPostfix}`,
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = testData.allUUIDs.length;
          testData.resultFileName = `${instancesUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            testData.resultFileName,
            totalRecordsCount,
            jobId,
            user.username,
            `AT_C405557_JobProfile_${randomPostfix}`,
          );

          cy.getUserToken(user.username, user.password);

          // Step 4: Download the recently created file with extension .mrc
          DataExportLogs.clickButtonWithText(testData.resultFileName);

          // Steps 5-7: Verify file includes both local and shared instances with Holdings and Items
          const commonAssertions = (instanceData, instanceTitle, electronicAccessData) => [
            (record) => {
              expect(record.get('001')[0].value).to.eq(instanceData.hrid);
            },
            (record) => {
              const field245 = record.fields.find((f) => f[0] === '245');
              expect(field245).to.deep.eq(['245', '  ', 'a', instanceTitle]);
            },
            // Verify both 856 fields (FOLIO and MARC holdings have the same electronic access)
            (record) => {
              const fields856 = record.fields.filter((f) => f[0] === '856');
              expect(fields856).to.have.lengthOf(2);
              fields856.forEach((field) => {
                expect(field).to.deep.eq([
                  '856',
                  '40',
                  'u',
                  electronicAccessData.uri,
                  'y',
                  electronicAccessData.linkText,
                  'z',
                  electronicAccessData.publicNote,
                  '3',
                  electronicAccessData.materialsSpecification,
                ]);
              });
            },
            // Verify both 876 fields (FOLIO and MARC items)
            (record) => {
              const fields876 = record.fields.filter((f) => f[0] === '876');
              expect(fields876).to.have.lengthOf(2);

              const folioItem = fields876.find((f) => {
                return f.includes(instanceData.items.folioItemBarcode);
              });
              expect(folioItem).to.deep.eq([
                '876',
                '  ',
                'a',
                instanceData.items.folioItemBarcode,
                '3',
                instanceData.folioHoldings.hrid,
              ]);

              const marcItem = fields876.find((f) => {
                return f.includes(instanceData.items.marcItemBarcode);
              });
              expect(marcItem).to.deep.eq([
                '876',
                '  ',
                'a',
                instanceData.items.marcItemBarcode,
                '3',
                instanceData.marcHoldings.hrid,
              ]);
            },
            // Verify both 901 fields (FOLIO and MARC holdings)
            (record) => {
              const fields901 = record.fields.filter((f) => f[0] === '901');
              expect(fields901).to.have.lengthOf(2);

              const folioHolding = fields901.find((f) => {
                return f.includes(instanceData.folioHoldings.hrid);
              });
              expect(folioHolding).to.deep.eq([
                '901',
                '  ',
                'a',
                instanceData.folioHoldings.hrid,
                'b',
                instanceData.folioHoldings.id,
              ]);

              const marcHolding = fields901.find((f) => {
                return f.includes(instanceData.marcHoldings.hrid);
              });
              expect(marcHolding).to.deep.eq([
                '901',
                '  ',
                'a',
                instanceData.marcHoldings.hrid,
                'b',
                instanceData.marcHoldings.id,
              ]);
            },
            // Verify both 902 fields (FOLIO and MARC items)
            (record) => {
              const fields902 = record.fields.filter((f) => f[0] === '902');
              expect(fields902).to.have.lengthOf(2);

              const folioItem = fields902.find((f) => {
                return f.includes(instanceData.items.folioItemHrid);
              });
              expect(folioItem).to.deep.eq([
                '902',
                '  ',
                'a',
                instanceData.items.folioItemHrid,
                'b',
                instanceData.items.folioItemId,
                '3',
                instanceData.folioHoldings.hrid,
              ]);

              const marcItem = fields902.find((f) => {
                return f.includes(instanceData.items.marcItemHrid);
              });
              expect(marcItem).to.deep.eq([
                '902',
                '  ',
                'a',
                instanceData.items.marcItemHrid,
                'b',
                instanceData.items.marcItemId,
                '3',
                instanceData.marcHoldings.hrid,
              ]);
            },
            (record) => {
              const field999 = record.get('999')[0];
              expect(field999.subf[0][0]).to.eq('i');
              expect(field999.subf[0][1]).to.eq(instanceData.uuid);
              expect(field999.subf[1][0]).to.eq('s');
            },
          ];

          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instances.localMarc.uuid,
              assertions: commonAssertions(
                testData.instances.localMarc,
                localMarcInstanceTitle,
                testData.electronicAccess.localMarc,
              ),
            },
            {
              uuid: testData.instances.sharedMarc.uuid,
              assertions: commonAssertions(
                testData.instances.sharedMarc,
                sharedMarcInstanceTitle,
                testData.electronicAccess.sharedMarc,
              ),
            },
          ];

          parseMrcFileContentAndVerify(
            testData.resultFileName,
            assertionsOnMarcFileContent,
            totalRecordsCount,
          );
        });
      },
    );
  });
});
