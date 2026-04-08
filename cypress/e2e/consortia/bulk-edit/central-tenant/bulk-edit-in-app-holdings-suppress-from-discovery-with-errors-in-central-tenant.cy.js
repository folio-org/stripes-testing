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

let user;
let instanceTypeId;
let collegeLocation;
let universityLocation;
let collegeMaterialTypeId;
let collegeLoanTypeId;
let universityMaterialTypeId;
let universityLoanTypeId;
let holdingSource;
const holdingsUUIDsFileName = `validHoldingsUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingsUUIDsFileName, true);
const suppressFromDiscovery = 'Suppress from discovery';
const folioInstance = {
  title: `AT_C496121_FolioInstance_${getRandomPostfix()}`,
  itemBarcodeInCollege: `folioItemCollege${getRandomPostfix()}`,
  itemBarcodeInUniversity: `folioItemUniversity${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C496121_MarcInstance_${getRandomPostfix()}`,
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
          permissions.uiInventoryViewCreateEditHoldings.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Affiliate user to College (Member-1) with holdings edit permission
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditHoldings.gui,
            ],
          });

          // Affiliate user to University (Member-2) with NO holdings edit permission
          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: user.userId,
            permissions: [permissions.bulkEditEdit.gui, permissions.uiInventoryViewInstances.gui],
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Create shared FOLIO instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // Create shared MARC instance
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
                      discoverySuppress: false,
                    }).then((holding) => {
                      instance.holdingIdInCollege = holding.id;

                      cy.getHoldings({ query: `"id"="${holding.id}"` }).then((holdings) => {
                        instance.holdingHridInCollege = holdings[0].hrid;
                      });
                    });
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
                  });
                });
            })
            .then(() => {
              // Create holdings and items in University tenant (Member-2) - NO USER HOLDINGS EDIT PERMISSION
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
                  });
                });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingsUUIDsFileName}`,
                `${folioInstance.holdingIdInCollege}\r\n${folioInstance.holdingIdInUniversity}\r\n${marcInstance.holdingIdInCollege}\r\n${marcInstance.holdingIdInUniversity}`,
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
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInCollege);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInCollege);
        });

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInUniversity);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInUniversity);
        });

        cy.resetTenant();
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        [
          holdingsUUIDsFileName,
          fileNames.matchedRecordsCSV,
          fileNames.previewRecordsCSV,
          fileNames.errorsFromCommitting,
        ].forEach((fileName) => {
          FileManager.deleteFile(`cypress/fixtures/${fileName}`);
        });

        FileManager.deleteFile(`cypress/downloads/${holdingsUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C496121 Verify "Suppress from discovery" action (with errors) for Holdings in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496121'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button => Select "Holdings UUIDs" from "Record identifier" dropdown
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload .csv file with valid Holdings UUIDs
          BulkEditSearchPane.uploadFile(holdingsUUIDsFileName);

          // Step 3: Check the result of uploading
          BulkEditSearchPane.verifyPaneTitleFileName(holdingsUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingsUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridInCollege,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridInUniversity,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);

          // Step 4: Click "Actions" menu => Click "Download matched records (CSV)" element
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              false,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              true,
            );
          });

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.matchedRecordsCSV).then((path) => {
            cy.wrap(path).as('matchedRecordsFixturePath');
          });

          // Step 5: Click "Actions" menu => Select the "Start bulk edit" element
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 6: Select "Suppress from discovery" option
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // Step 7: Select "Set false" option, verify apply to items checkbox is available
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_FALSE);
          BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.SET_FALSE);
          BulkEditActions.applyToItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Check the "Apply to all items records" checkbox
          BulkEditActions.checkApplyToItemsRecordsCheckbox();

          // Step 9: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHridInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHridInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);

          // Step 10: Click "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              false,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
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
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 12: Check the table populated with up to 10 rows (errors only, warnings hidden)
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.holdingIdInUniversity,
              ERROR_MESSAGES.getUserPermissionError(
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

          // Step 14: Check the reason for the Holdings with associated Items in member-1 tenant (College)
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.holdingIdInCollege,
              ERROR_MESSAGES.NO_CHANGE_HOLDINGS_SUPPRESSED_ITEMS_UPDATED,
              'Warning',
            );
          });

          // Step 15: Check the reason for the Holdings with associated Items in member-2 tenant (University)
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.holdingIdInUniversity,
              ERROR_MESSAGES.getUserPermissionError(
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
            `ERROR,${folioInstance.holdingIdInUniversity},${ERROR_MESSAGES.getUserPermissionError(user.username, 'holdings', folioInstance.holdingIdInUniversity, Affiliations.University)}`,
            `ERROR,${marcInstance.holdingIdInUniversity},${ERROR_MESSAGES.getUserPermissionError(user.username, 'holdings', marcInstance.holdingIdInUniversity, Affiliations.University)}`,
            `WARNING,${folioInstance.holdingIdInCollege},${ERROR_MESSAGES.NO_CHANGE_HOLDINGS_SUPPRESSED_ITEMS_UPDATED}`,
            `WARNING,${marcInstance.holdingIdInCollege},${ERROR_MESSAGES.NO_CHANGE_HOLDINGS_SUPPRESSED_ITEMS_UPDATED}`,
          ]);

          // Save downloaded file to fixtures to preserve it before it gets overwritten in logs download
          ExportFile.moveDownloadedFileToFixtures(fileNames.errorsFromCommitting).then((path) => {
            cy.wrap(path).as('errorsFixturePath');
          });

          // Step 17: Navigate to "Logs" tab of Bulk edit
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();

          // Step 18: Check "Inventory - holdings" checkbox on "Record types" filter accordion
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.verifyCheckboxIsSelected('HOLDINGS_RECORD', true);

          // Step 19: Click on the "..." action element in the row with the recently completed Bulk Edit job
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          // Step 20: Click on the "File that was used to trigger the bulk edit" hyperlink
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(holdingsUUIDsFileName, [
            folioInstance.holdingIdInCollege,
            folioInstance.holdingIdInUniversity,
            marcInstance.holdingIdInCollege,
            marcInstance.holdingIdInUniversity,
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
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHridInCollege);
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

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          // Step 25: Verify changes in member-2 (University)
          instances.forEach((instance) => {
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHridInUniversity);
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
