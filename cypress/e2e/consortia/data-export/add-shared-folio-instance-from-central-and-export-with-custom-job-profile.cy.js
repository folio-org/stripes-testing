/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verify005FieldValue,
  verifyLeaderPositions,
  verify008FieldValue,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const postfix = getRandomPostfix();
const recordsCount = 3;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
];
const instanceUUIDsFileName = `AT_C407653_instanceUUIDs_${postfix}.csv`;
const customMappingProfileName = `AT_C407653_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C407653_CustomJobProfile_${postfix} export job profile`;
const testData = {
  localFolioInstance: {
    title: `AT_C407653_Local_FolioInstance_${getRandomPostfix()}`,
  },
  sharedFolioInstance: {
    title: `AT_C407653_Shared_FolioInstance_${getRandomPostfix()}`,
  },
  newSharedInstance: {
    title: `AT_C407653_NewShared_FolioInstance_${getRandomPostfix()}`,
  },
};

// Custom mapping profile configuration function
const createCustomMappingProfile = () => ({
  default: false,
  recordTypes: ['SRS', 'HOLDINGS', 'ITEM'],
  outputFormat: 'MARC',
  fieldsSuppression: '',
  suppress999ff: false,
  name: customMappingProfileName,
  transformations: [
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
      fieldId: 'instance.hrid',
      path: '$.instance.hrid',
      recordType: 'INSTANCE',
      transformation: '001  ',
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
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407653');

      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            ...userPermissions,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ],
        }).then(() => {
          cy.withinTenant(Affiliations.College, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407653');

            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.materialTypeId = res.id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypeId = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });

            // Create local FOLIO instance in member tenant
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.localFolioInstance.title,
              },
            }).then((createdInstanceData) => {
              testData.localFolioInstance.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(testData.localFolioInstance.uuid).then((instanceData) => {
                testData.localFolioInstance.hrid = instanceData.hrid;
              });

              // Add holdings to local instance
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.localFolioInstance.uuid,
                sourceId: testData.sourceId,
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              }).then((holding) => {
                testData.localFolioInstance.holdings = {
                  id: holding.id,
                  hrid: holding.hrid,
                };

                // Add item to local instance
                InventoryItems.createItemViaApi({
                  barcode: `AT_C407653_local_${getRandomPostfix()}`,
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.localFolioInstance.items = {
                    id: item.id,
                    hrid: item.hrid,
                    barcode: item.barcode,
                  };
                });
              });
            });
          });

          // Create shared FOLIO instance in Consortia tenant
          cy.withinTenant(Affiliations.Consortia, () => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.sharedFolioInstance.title,
              },
            }).then((createdInstanceData) => {
              testData.sharedFolioInstance.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(testData.sharedFolioInstance.uuid).then((instanceData) => {
                testData.sharedFolioInstance.hrid = instanceData.hrid;
              });
            });
          });

          // Add holdings and item to shared instance in College tenant
          cy.withinTenant(Affiliations.College, () => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.sharedFolioInstance.uuid,
              sourceId: testData.sourceId,
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            }).then((holding) => {
              testData.sharedFolioInstance.holdings = {
                id: holding.id,
                hrid: holding.hrid,
              };

              // Add item to shared instance
              InventoryItems.createItemViaApi({
                barcode: `AT_C407653_shared_${getRandomPostfix()}`,
                holdingsRecordId: holding.id,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.sharedFolioInstance.items = {
                  id: item.id,
                  hrid: item.hrid,
                  barcode: item.barcode,
                };
              });
            });

            // Create custom mapping profile and job profile
            const customMappingProfile = createCustomMappingProfile();

            cy.createDataExportCustomMappingProfile(customMappingProfile).then((response) => {
              testData.mappingProfileId = response.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                customJobProfileName,
                testData.mappingProfileId,
              ).then((jobResponse) => {
                testData.jobProfileId = jobResponse.body.id;
              });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        [testData.localFolioInstance.items.id, testData.sharedFolioInstance.items.id].forEach(
          (itemId) => {
            InventoryItems.deleteItemViaApi(itemId);
          },
        );
        [
          testData.localFolioInstance.holdings.id,
          testData.sharedFolioInstance.holdings.id,
          testData.newSharedInstance.holdings.id,
        ].forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });
        InventoryInstance.deleteInstanceViaApi(testData.localFolioInstance.uuid);
        ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        [testData.sharedFolioInstance.uuid, testData.newSharedInstance.uuid].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407653 Consortia | Add shared FOLIO instance from central and export with Custom job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407653'] },
      () => {
        // Step 1: Go to "Inventory" app => Select "Actions" => Select "New shared record" button
        InventoryInstances.addNewInventory();

        // Step 2: Fill in the "Resource title*" field with any Instance's title
        InventoryNewInstance.fillResourceTitle(testData.newSharedInstance.title);

        // Step 3: Select from the "Resource type*" dropdown any existing resource type
        InventoryNewInstance.fillResourceType();

        // Step 4: Click the "Save and close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.newSharedInstance.title);
        InventoryInstance.checkSharedTextInDetailView();
        InventoryInstance.getAssignedHRID().then((hrid) => {
          testData.newSharedInstance.hrid = hrid;
        });

        InventoryInstance.getId().then((uuid) => {
          testData.newSharedInstance.uuid = uuid;

          // Step 5: Switch affiliation to member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          // Step 6: Add Holdings by clicking on the "Add holdings" button
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventoryInstances.searchByTitle(testData.newSharedInstance.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.newSharedInstance.title);
          InventoryInstance.checkSharedTextInDetailView();
          InventoryInstance.pressAddHoldingsButton();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.fillHoldingFields({
            permanentLocation: LOCATION_NAMES.ANNEX,
          });
          HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.getHoldingsIDInDetailView().then((holdingId) => {
            testData.newSharedInstance.holdings = {
              id: holdingId,
            };
          });
          HoldingsRecordView.getHoldingsHrId().then((holdingHrid) => {
            testData.newSharedInstance.holdings.hrid = holdingHrid;
          });
          InventoryInstance.closeHoldingsView();
          InventoryInstance.waitLoading();

          // Step 7: Go to the "Data export" app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();

          // Create CSV file with all instance UUIDs
          const allInstances = [
            testData.localFolioInstance,
            testData.sharedFolioInstance,
            testData.newSharedInstance,
          ];

          const uuids = allInstances.map((instance) => instance.uuid).join('\n');

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

          // Step 8: Trigger the data export by clicking on the "or choose file" button
          ExportFileHelper.uploadFile(instanceUUIDsFileName);

          // Step 9: Run the customized export job profile
          ExportFileHelper.exportWithDefaultJobProfile(
            instanceUUIDsFileName,
            `AT_C407653_CustomJobProfile_${postfix}`,
          );

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const jobId = jobData.hrId;
            exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            // Step 10: Download the recently created file
            DataExportResults.verifySuccessExportResultCells(
              exportedFileName,
              recordsCount,
              jobId,
              user.username,
              `AT_C407653_CustomJobProfile_${postfix}`,
            );
            DataExportLogs.clickButtonWithText(exportedFileName);

            // Steps 11-13: Verify the downloaded .mrc file includes all instances
            // Common assertions for all FOLIO instances
            const todayDateYYMMDD = DateTools.getCurrentDateYYMMDD();

            const commonAssertions = (instance) => [
              (record) => {
                verifyLeaderPositions(record, {
                  5: 'n',
                  6: 'a',
                  7: 'm',
                });
              },
              (record) => verify001FieldValue(record, instance.hrid),
              (record) => verify005FieldValue(record),
              (record) => {
                verify008FieldValue(record, `${todayDateYYMMDD}|||||||||||||||||       |||||und||`);
              },
              (record) => {
                verifyMarcFieldByTag(record, '245', {
                  ind1: '0',
                  ind2: '0',
                  subfields: ['a', instance.title],
                });
              },

              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '901', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', instance.holdings.hrid],
                    ['b', instance.holdings.id],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '999', {
                  ind1: 'f',
                  ind2: 'f',
                  subfields: ['i', instance.uuid],
                });
              },
            ];

            // Custom mapping assertions for instances with items
            const itemMappingAssertions = (instance) => [
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '876', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', instance.items.barcode],
                    ['3', instance.holdings.hrid],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(record, '902', {
                  ind1: ' ',
                  ind2: ' ',
                  subfields: [
                    ['a', instance.items.hrid],
                    ['b', instance.items.id],
                    ['3', instance.holdings.hrid],
                  ],
                });
              },
            ];

            const recordsToVerify = allInstances.map((instance) => {
              // newSharedInstance only has holdings, no items
              if (instance.uuid === testData.newSharedInstance.uuid) {
                return {
                  uuid: instance.uuid,
                  assertions: commonAssertions(instance),
                };
              }

              return {
                uuid: instance.uuid,
                assertions: [...commonAssertions(instance), ...itemMappingAssertions(instance)],
              };
            });

            parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount);
          });
        });
      },
    );
  });
});
