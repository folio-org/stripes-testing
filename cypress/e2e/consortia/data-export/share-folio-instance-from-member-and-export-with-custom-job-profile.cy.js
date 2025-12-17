/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames, tenantCodes } from '../../../support/dictionary/affiliations';
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
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder,
  verify001FieldValue,
  verifyLeaderPositions,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const postfix = getRandomPostfix();
const recordsCount = 3;
const userPermissions = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
];
const instanceUUIDsFileName = `AT_C407652_instanceUUIDs_${postfix}.csv`;
const customMappingProfileName = `AT_C407652_CustomMappingProfile_${postfix}`;
const customJobProfileName = `AT_C407652_CustomJobProfile_${postfix} export job profile`;
const testData = {
  localFolioInstance: {
    title: `AT_C407652_Local_FolioInstance_${getRandomPostfix()}`,
  },
  sharedFolioInstance: {
    title: `AT_C407652_Shared_FolioInstance_${getRandomPostfix()}`,
  },
  createdFolioInstance: {
    title: `AT_C407652_Created_FolioInstance_${getRandomPostfix()}`,
  },
};

const createCustomMappingProfile = () => ({
  default: false,
  recordTypes: ['INSTANCE', 'HOLDINGS', 'ITEM'],
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
      fieldId: 'instance.id',
      path: '$.instance.id',
      recordType: 'INSTANCE',
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

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407652');

      cy.createTempUser(userPermissions).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [...userPermissions, permissions.consortiaInventoryShareLocalInstance.gui],
        }).then(() => {
          cy.getInstanceTypes({ query: 'name=="text"' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });

          cy.withinTenant(Affiliations.College, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407652');

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

                InventoryItems.createItemViaApi({
                  barcode: `AT_C407652_local_${getRandomPostfix()}`,
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

              InventoryItems.createItemViaApi({
                barcode: `AT_C407652_shared_${getRandomPostfix()}`,
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
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
          testData.createdFolioInstance.holdings.id,
        ].forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });
        InventoryInstance.deleteInstanceViaApi(testData.localFolioInstance.uuid);
        ExportJobProfiles.deleteJobProfileViaApi(testData.jobProfileId);
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.mappingProfileId);
      });
      cy.withinTenant(Affiliations.Consortia, () => {
        [testData.sharedFolioInstance.uuid, testData.createdFolioInstance.uuid].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C407652 Consortia | Share FOLIO instance from member and export with Custom job profile (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C407652'] },
      () => {
        // Step 1: Go to "Inventory" app => Select "Actions" => Select "New local record" button
        InventoryInstances.addNewInventory();

        // Step 2: Fill in the "Resource title*" field with any Instance's title
        InventoryNewInstance.fillResourceTitle(testData.createdFolioInstance.title);

        // Step 3: Select from the "Resource type*" dropdown any existing resource type
        InventoryNewInstance.fillResourceType();

        // Step 4: Click the "Save and close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.createdFolioInstance.title);
        InventoryInstance.getAssignedHRID().then((hrid) => {
          testData.createdFolioInstance.hrid = hrid;
        });

        InventoryInstance.getId().then((instanceId) => {
          testData.createdFolioInstance.uuid = instanceId;

          // Step 5: Click on the "Actions" menu button => Select "Share local instance" option => Click "Share" in "Are you sure you want to share this instance?" modal
          InventoryInstance.shareInstance();
          InventoryInstance.verifyCalloutMessage(
            `Local instance ${testData.createdFolioInstance.title} has been successfully shared`,
          );
          InventoryInstance.checkSharedTextInDetailView();
          InventoryInstance.getAssignedHRID().then((updatedHrid) => {
            expect(updatedHrid.toLowerCase().startsWith(tenantCodes.central.toLowerCase())).to.be
              .true;
            testData.createdFolioInstance.hrid = updatedHrid;

            // Step 6: Add Holdings by clicking on the "Add holdings" button => Fill in mandatory fields => Click "Save & close" button
            InstanceRecordView.addHoldings();
            InventoryNewHoldings.fillPermanentLocation(LOCATION_NAMES.MAIN_LIBRARY);
            InventoryNewHoldings.saveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              testData.createdFolioInstance.holdings = { id: holdingsID };
            });
            HoldingsRecordView.getHoldingsHrId().then((holdingsHRID) => {
              testData.createdFolioInstance.holdings.hrid = holdingsHRID;
            });

            // Step 7: Go to the "Data export" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();

            // Step 8: Trigger the data export by clicking on the "or choose file" button and submitting .csv file with Instances UUIDs
            const allInstances = [
              testData.localFolioInstance,
              testData.sharedFolioInstance,
              testData.createdFolioInstance,
            ];
            const uuids = allInstances.map((instance) => instance.uuid).join('\n');

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, uuids);

            ExportFileHelper.uploadFile(instanceUUIDsFileName);

            // Step 9: Run the customized export job profile by clicking on it > Specify "Instance" type > Click on "Run" button
            ExportFileHelper.exportWithDefaultJobProfile(
              instanceUUIDsFileName,
              `AT_C407652_CustomJobProfile_${postfix}`,
            );

            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
            cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedFileName = `${instanceUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

              // Step 10: Download the recently created file with extension .mrc by clicking on file name hyperlink
              DataExportResults.verifySuccessExportResultCells(
                exportedFileName,
                recordsCount,
                jobId,
                user.username,
                `AT_C407652_CustomJobProfile_${postfix}`,
              );
              DataExportLogs.clickButtonWithText(exportedFileName);

              // Steps 11-13: Run the downloaded .mrc file and verify it includes all instances with custom mapping transformations
              const customMappingAssertions = (instance) => {
                const baseAssertions = [
                  (record) => verify001FieldValue(record, instance.hrid),
                  (record) => {
                    verifyLeaderPositions(record, {
                      5: 'n',
                      6: 'a',
                      7: 'm',
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

                // Add item-specific assertions only if instance has items
                if (instance.items) {
                  baseAssertions.push(
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
                  );
                }

                return baseAssertions;
              };
              const recordsToVerify = allInstances.map((instance) => ({
                uuid: instance.uuid,
                assertions: customMappingAssertions(instance),
              }));

              parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount, false);
            });
          });
        });
      },
    );
  });
});
