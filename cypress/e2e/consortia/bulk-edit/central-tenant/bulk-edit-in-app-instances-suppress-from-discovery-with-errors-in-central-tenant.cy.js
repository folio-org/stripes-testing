import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

let user;
let instanceTypeId;
let collegeLocation;
let universityLocation;
let collegeMaterialTypeId;
let collegeLoanTypeId;
let universityMaterialTypeId;
let universityLoanTypeId;
let holdingSource;
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const suppressFromDiscovery = 'Suppress from discovery';
const folioInstance = {
  title: `AT_C496152_FolioInstance_${getRandomPostfix()}`,
  itemBarcodeInCollege: `folioItemCollege${getRandomPostfix()}`,
  itemBarcodeInUniversity: `folioItemUniversity${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C496152_MarcInstance_${getRandomPostfix()}`,
  itemBarcodeInCollege: `marcItemCollege${getRandomPostfix()}`,
  itemBarcodeInUniversity: `marcItemUniversity${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Affiliate user to College (Member-1) only - NO University affiliation
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [permissions.bulkEditView.gui, permissions.uiInventoryViewInstances.gui],
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Create shared FOLIO instance (NOT suppressed)
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                  discoverySuppress: false,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // Create shared MARC instance (NOT suppressed)
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  marcInstance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // Create holdings and items in College tenant (Member-1)
              cy.setTenant(Affiliations.College);

              cy.getLocations({ limit: 1 }).then((res) => {
                collegeLocation = res;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                collegeMaterialTypeId = res.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                collegeLoanTypeId = res[0].id;
              });

              InventoryHoldings.getHoldingsFolioSource()
                .then((holdingSources) => {
                  holdingSource = holdingSources.id;
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.uuid,
                      permanentLocationId: collegeLocation.id,
                      sourceId: holdingSource,
                      discoverySuppress: true,
                    }).then((holding) => {
                      instance.holdingIdInCollege = holding.id;

                      cy.getHoldings({ query: `"id"="${holding.id}"` }).then((holdings) => {
                        instance.holdingHridInCollege = holdings[0].hrid;
                      });
                    });
                    cy.wait(1000);
                  });
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryItems.createItemViaApi({
                      barcode: instance.itemBarcodeInCollege,
                      holdingsRecordId: instance.holdingIdInCollege,
                      materialType: { id: collegeMaterialTypeId },
                      permanentLoanType: { id: collegeLoanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      discoverySuppress: true,
                    }).then((item) => {
                      instance.itemIdInCollege = item.id;
                    });
                    cy.wait(1000);
                  });
                });
            })
            .then(() => {
              // Create holdings and items in University tenant (Member-2) - NO USER AFFILIATION
              cy.setTenant(Affiliations.University);

              cy.getLocations({ limit: 1 }).then((res) => {
                universityLocation = res;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                universityMaterialTypeId = res.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                universityLoanTypeId = res[0].id;
              });

              InventoryHoldings.getHoldingsFolioSource()
                .then((holdingSources) => {
                  holdingSource = holdingSources.id;
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.uuid,
                      permanentLocationId: universityLocation.id,
                      sourceId: holdingSource,
                      discoverySuppress: true,
                    }).then((holding) => {
                      instance.holdingIdInUniversity = holding.id;

                      cy.getHoldings({ query: `"id"="${holding.id}"` }).then((holdings) => {
                        instance.holdingHridInUniversity = holdings[0].hrid;
                      });
                    });
                    cy.wait(1000);
                  });
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryItems.createItemViaApi({
                      barcode: instance.itemBarcodeInUniversity,
                      holdingsRecordId: instance.holdingIdInUniversity,
                      materialType: { id: universityMaterialTypeId },
                      permanentLoanType: { id: universityLoanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      discoverySuppress: true,
                    }).then((item) => {
                      instance.itemIdInUniversity = item.id;
                    });
                    cy.wait(1000);
                  });
                });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.uuid}\r\n${marcInstance.uuid}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete items and holdings from College tenant
        cy.setTenant(Affiliations.College);
        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInCollege);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInCollege);
        });

        // Delete items and holdings from University tenant
        cy.setTenant(Affiliations.University);
        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInUniversity);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInUniversity);
        });

        // Delete instances and user from central tenant
        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        [
          instanceUUIDsFileName,
          fileNames.matchedRecordsCSV,
          fileNames.previewRecordsCSV,
          fileNames.errorsFromCommitting,
        ].forEach((fileName) => {
          FileManager.deleteFile(`cypress/fixtures/${fileName}`);
        });
        FileManager.deleteFile(`cypress/downloads/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C496152 Verify "Suppress from discovery" action (with errors) for Instances in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496152'] },
        () => {
          // Step 1: Select "Inventory - instances" radio button => Select "Instance UUIDs" from "Record identifier" dropdown
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload .csv file with valid Instance UUIDs
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);

          // Step 3: Check the result of uploading
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              instance.title,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Click "Actions" menu => Click "Download matched records (CSV)" element
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.matchedRecordsCSV).then((path) => {
            cy.wrap(path).as('matchedRecordsFixturePath');
          });

          // Step 5: Click "Actions" menu => Select the "FOLIO Instances" element
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 6: Select "Suppress from discovery" option
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // Step 7: Select "Set false" option
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_FALSE);
          BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.SET_FALSE);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Check the checkboxes
          BulkEditActions.clickApplyToHoldingsRecordsCheckbox();
          BulkEditActions.checkApplyToItemsRecordsCheckbox();

          // Step 9: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 10: Click "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.previewRecordsCSV).then((path) => {
            cy.wrap(path).as('previewRecordsFixturePath');
          });

          // Step 11: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(0);
          BulkEditSearchPane.verifyNoChangesPreview();
          BulkEditSearchPane.verifyErrorLabel(2, 2);
          BulkEditSearchPane.verifyShowWarningsCheckbox(false, false);

          // Step 12: Check the table populated with up to 10 rows (errors only, warnings hidden)
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.uuid,
              ERROR_MESSAGES.getUserAffiliationError(
                user.username,
                'holdings',
                instance.holdingIdInUniversity,
                Affiliations.University,
              ),
              'Error',
            );
          });

          // Step 13: Check the "Show warnings" checkbox
          BulkEditSearchPane.clickShowWarningsCheckbox();
          BulkEditSearchPane.verifyShowWarningsCheckbox(false, true);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(4);

          // Step 14: Check the reason for the Instance with associated Holdings, Items in member-1 tenant
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.uuid,
              ERROR_MESSAGES.NO_CHANGE_INSTANCE_SUPPRESSED_RECORDS_UPDATED,
              'Warning',
            );
          });

          // Step 15: Check the reason for the Instance with associated Holdings, Items in member-2 tenant
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.uuid,
              ERROR_MESSAGES.getUserAffiliationError(
                user.username,
                'holdings',
                instance.holdingIdInUniversity,
                Affiliations.University,
              ),
              'Error',
            );
          });

          // Step 16: Click "Actions" menu => Click "Download errors (CSV)" option
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();

          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${folioInstance.uuid},${ERROR_MESSAGES.getUserAffiliationError(user.username, 'holdings', folioInstance.holdingIdInUniversity, Affiliations.University)}`,
            `ERROR,${marcInstance.uuid},${ERROR_MESSAGES.getUserAffiliationError(user.username, 'holdings', marcInstance.holdingIdInUniversity, Affiliations.University)}`,
            `WARNING,${folioInstance.uuid},${ERROR_MESSAGES.NO_CHANGE_INSTANCE_SUPPRESSED_RECORDS_UPDATED}`,
            `WARNING,${marcInstance.uuid},${ERROR_MESSAGES.NO_CHANGE_INSTANCE_SUPPRESSED_RECORDS_UPDATED}`,
          ]);

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.errorsFromCommitting).then((path) => {
            cy.wrap(path).as('errorsFixturePath');
          });

          // Step 17: Navigate to "Logs" tab of Bulk edit
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();

          // Step 18: Check "Inventory - instances" checkbox on "Record types" filter accordion
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyCheckboxIsSelected('INSTANCE', true);

          // Step 19: Click on the "..." action element in the row with the recently completed Bulk Edit job
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          // Step 20: Click on the "File that was used to trigger the bulk edit" hyperlink
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceUUIDsFileName, [
            folioInstance.uuid,
            marcInstance.uuid,
          ]);

          // Step 21: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          // Verify that file downloaded from logs has the same content as file from Step 4
          cy.get('@matchedRecordsFixturePath').then((matchedRecordsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              matchedRecordsFixturePath,
              `cypress/downloads/${fileNames.matchedRecordsCSV}`,
            );
          });

          // Step 22: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();
          // Verify that file downloaded from logs has the same content as file from Step 10
          cy.get('@previewRecordsFixturePath').then((previewRecordsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              previewRecordsFixturePath,
              `cypress/downloads/${fileNames.previewRecordsCSV}`,
            );
          });

          // Step 23: Click on the "File with errors encountered when committing the changes" hyperlink
          BulkEditLogs.downloadFileWithCommitErrors();
          // Verify that file downloaded from logs has the same content as file from Step 16
          cy.get('@errorsFixturePath').then((errorsFixturePath) => {
            BulkEditFiles.verifyTwoCSVFilesHaveSameContent(
              errorsFixturePath,
              `cypress/downloads/${fileNames.errorsFromCommitting}`,
            );
          });

          // Step 24: Navigate to "Inventory" app => Verify changes in member-1 (College)
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(collegeLocation.name);
            InventoryInstance.openItemByBarcode(instance.itemBarcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.suppressedAsDiscoveryIsAbsent();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(universityLocation.name);
            InventoryInstance.openItemByBarcode(instance.itemBarcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.suppressedAsDiscoveryIsPresent();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
