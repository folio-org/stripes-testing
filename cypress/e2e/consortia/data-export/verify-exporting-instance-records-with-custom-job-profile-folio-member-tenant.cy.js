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
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  ITEM_STATUS_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  INSTANCE_SOURCE_NAMES,
} from '../../../support/constants';

let user;
const randomPostfix = getRandomPostfix();
const instancesUUIDsFileName = `AT_C405558_instances_${randomPostfix}.csv`;
const mappingProfileName = `AT_C405558_MappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C405558_JobProfile_${randomPostfix} export job profile`;
const localFolioInstanceTitle = `AT_C405558_LocalFolioInstance_${randomPostfix}`;
const sharedFolioInstanceTitle = `AT_C405558_SharedFolioInstance_${randomPostfix}`;
const testData = {
  instances: {
    localFolio: {},
    sharedFolio: {},
  },
  allUUIDs: [],
  electronicAccess: {
    localFolio: {
      uri: 'https://example.com/local-folio',
      linkText: 'Local FOLIO Link',
      materialsSpecification: 'Local FOLIO Materials',
      publicNote: 'Local FOLIO Public Note',
    },
    sharedFolio: {
      uri: 'https://example.com/shared-folio',
      linkText: 'Shared FOLIO Link',
      materialsSpecification: 'Shared FOLIO Materials',
      publicNote: 'Shared FOLIO Public Note',
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
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
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
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource()
          .then((folioSource) => {
            testData.sourceId = folioSource.id;
          })
          .then(() => {
            // Create shared FOLIO instance in Central tenant
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: sharedFolioInstanceTitle,
                source: INSTANCE_SOURCE_NAMES.FOLIO,
              },
            }).then((createdInstanceData) => {
              testData.instances.sharedFolio.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                testData.instances.sharedFolio.hrid = instance.hrid;
              });
            });

            // Create local FOLIO instance and holdings/items in member tenant (College)
            cy.setTenant(Affiliations.College);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: localFolioInstanceTitle,
                source: INSTANCE_SOURCE_NAMES.FOLIO,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                  callNumber: `AT_C405558_LocalFolio_CN_${randomPostfix}`,
                  electronicAccess: [
                    {
                      relationshipId: testData.resourceRelationshipId,
                      uri: testData.electronicAccess.localFolio.uri,
                      linkText: testData.electronicAccess.localFolio.linkText,
                      materialsSpecification:
                        testData.electronicAccess.localFolio.materialsSpecification,
                      publicNote: testData.electronicAccess.localFolio.publicNote,
                    },
                  ],
                },
              ],
              items: [
                {
                  barcode: `AT_C405558_LocalFolio_${randomPostfix}`,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                },
              ],
            })
              .then((instanceData) => {
                const { instanceId, holdings, items } = instanceData;
                const [holding] = holdings;
                const [item] = items;

                testData.instances.localFolio = {
                  uuid: instanceId,
                  holdings: { id: holding.id },
                  items: { id: item.id, hrid: item.hrid, barcode: item.barcode },
                };

                // Get instance and holding HRIDs
                cy.getInstanceById(instanceId).then((instance) => {
                  testData.instances.localFolio.hrid = instance.hrid;
                });

                cy.getHoldings({ limit: 1, query: `"id"=="${holding.id}"` }).then(
                  (holdingsData) => {
                    testData.instances.localFolio.holdings.hrid = holdingsData[0].hrid;
                  },
                );
              })
              .then(() => {
                // Add holdings and items to shared instance in member tenant
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.instances.sharedFolio.uuid,
                  sourceId: testData.sourceId,
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                  callNumber: `AT_C405558_SharedFolio_CN_${randomPostfix}`,
                  electronicAccess: [
                    {
                      relationshipId: testData.resourceRelationshipId,
                      uri: testData.electronicAccess.sharedFolio.uri,
                      linkText: testData.electronicAccess.sharedFolio.linkText,
                      materialsSpecification:
                        testData.electronicAccess.sharedFolio.materialsSpecification,
                      publicNote: testData.electronicAccess.sharedFolio.publicNote,
                    },
                  ],
                }).then((holding) => {
                  testData.instances.sharedFolio.holdings = { id: holding.id };

                  cy.getHoldings({ limit: 1, query: `"id"=="${holding.id}"` }).then((holdings) => {
                    testData.instances.sharedFolio.holdings.hrid = holdings[0].hrid;

                    InventoryItems.createItemViaApi({
                      barcode: `AT_C405558_SharedFolio_${randomPostfix}`,
                      holdingsRecordId: holding.id,
                      materialType: { id: testData.materialTypeId },
                      permanentLoanType: { id: testData.loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      // Store items data
                      testData.instances.sharedFolio.items = {
                        id: item.id,
                        hrid: item.hrid,
                        barcode: item.barcode,
                      };
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
                  testData.instances.localFolio.uuid,
                  testData.instances.sharedFolio.uuid,
                ];

                FileManager.createFile(
                  `cypress/fixtures/${instancesUUIDsFileName}`,
                  testData.allUUIDs.join('\n'),
                );
              });
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
        testData.instances.localFolio.uuid,
      );
      cy.deleteItemViaApi(testData.instances.sharedFolio.items.id);
      cy.deleteHoldingRecordViaApi(testData.instances.sharedFolio.holdings.id);
      ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      cy.resetTenant();
      InventoryInstance.deleteInstanceViaApi(testData.instances.sharedFolio.uuid);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instancesUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(testData.resultFileName);
    });

    it(
      'C405558 Consortia | Verify exporting instance records with Custom job profile FOLIO - member tenant (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C405558'] },
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
          `AT_C405558_JobProfile_${randomPostfix}`,
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
            `AT_C405558_JobProfile_${randomPostfix}`,
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

              expect(field245).to.deep.eq(['245', '00', 'a', instanceTitle]);
            },
            // Verify 856 field (electronic access)
            (record) => {
              const field856 = record.fields.find((f) => f[0] === '856');

              expect(field856).to.deep.eq([
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
            },
            // Verify 876 field (item barcode)
            (record) => {
              const field876 = record.fields.find((f) => f[0] === '876');

              expect(field876).to.deep.eq([
                '876',
                '  ',
                'a',
                instanceData.items.barcode,
                '3',
                instanceData.holdings.hrid,
              ]);
            },
            // Verify 901 field (holdings)
            (record) => {
              const field901 = record.fields.find((f) => f[0] === '901');

              expect(field901).to.deep.eq([
                '901',
                '  ',
                'a',
                instanceData.holdings.hrid,
                'b',
                instanceData.holdings.id,
              ]);
            },
            // Verify 902 field (item)
            (record) => {
              const field902 = record.fields.find((f) => f[0] === '902');

              expect(field902).to.deep.eq([
                '902',
                '  ',
                'a',
                instanceData.items.hrid,
                'b',
                instanceData.items.id,
                '3',
                instanceData.holdings.hrid,
              ]);
            },
            (record) => {
              const field999 = record.get('999')[0];

              expect(field999.subf[0][0]).to.eq('i');
              expect(field999.subf[0][1]).to.eq(instanceData.uuid);
            },
          ];

          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instances.localFolio.uuid,
              assertions: commonAssertions(
                testData.instances.localFolio,
                localFolioInstanceTitle,
                testData.electronicAccess.localFolio,
              ),
            },
            {
              uuid: testData.instances.sharedFolio.uuid,
              assertions: commonAssertions(
                testData.instances.sharedFolio,
                sharedFolioInstanceTitle,
                testData.electronicAccess.sharedFolio,
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
