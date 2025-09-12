import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let initialStatisticalCodes;
let newStatisticalCodes;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const folioInstance = {
  title: `AT_C663249_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C663249_MarcInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get statistical codes
        cy.getStatisticalCodes({ limit: 5 }).then((codes) => {
          cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
            codes.forEach((code) => {
              code.typeName = codeTypes.filter(
                (item) => item.id === code.statisticalCodeTypeId,
              )[0].name;
              code.fullName = `${code.typeName}: ${code.code} - ${code.name}`;
            });

            // Split codes into initial (to be removed) and new (to be added)
            initialStatisticalCodes = codes.slice(0, 2);
            newStatisticalCodes = codes.slice(2, 5);
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Create FOLIO instance with initial statistical codes
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                  statisticalCodeIds: initialStatisticalCodes.map((code) => code.id),
                },
              }).then((createdInstanceData) => {
                folioInstance.instanceId = createdInstanceData.instanceId;

                // Get HRID for the FOLIO instance
                cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                  folioInstance.instanceHrid = instance.hrid;
                });
              });

              // Create MARC instance with initial statistical codes
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.instanceId = instanceId;

                cy.getInstanceById(instanceId).then((instance) => {
                  marcInstance.instanceHrid = instance.hrid;

                  // Add initial statistical codes to MARC instance
                  instance.statisticalCodeIds = initialStatisticalCodes.map((code) => code.id);
                  cy.updateInstance(instance);
                });
              });
            })
            .then(() => {
              // Create CSV file with instance UUIDs
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.instanceId}\n${marcInstance.instanceId}`,
              );
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      [folioInstance.instanceId, marcInstance.instanceId].forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C663249 Verify multiple edits to Instance statistical codes in one bulk edit job (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663249'] },
      () => {
        const instances = [folioInstance, marcInstance];

        // Step 1: Select the "Inventory - instances" radio button and "Instance UUIDs" option
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload a .csv file with valid Instances UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Instances UUIDs
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
          );
        });

        // Step 4: Show Source column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );

        // Step 5: Download matched records
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        instances.forEach((instance) => {
          // Verify initial statistical codes are present
          const initialCodesString = initialStatisticalCodes.map((code) => code.fullName).join('|');

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            initialCodesString,
          );
        });

        // Step 6: Start bulk edit for FOLIO Instances
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Step 7: Select "Statistical code" option
        BulkEditActions.selectOption('Statistical code');
        BulkEditActions.verifyTheActionOptions(['Add', 'Remove', 'Remove all']);

        // Step 8: Select "Remove all" action
        BulkEditActions.selectAction('Remove all');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Try to add another "Statistical code" option - should not be available
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clickOptionsSelection(1);
        BulkEditActions.verifyOptionExistsInSelectOptionDropdown('Statistical code', false);

        // Step 10: Change first row action to "Add"
        BulkEditActions.selectAction('Add');
        BulkEditActions.verifyTheActionOptions(['Add', 'Remove', 'Remove all']);

        // Step 11: Select new statistical codes to add
        newStatisticalCodes.forEach((code) => {
          BulkEditActions.selectStatisticalCodeValue(code.fullName);
        });

        // Step 12: Now "Statistical code" should be available for second row
        BulkEditActions.selectOption('Statistical code', 1);

        // Step 13: Select "Remove" action for second row
        BulkEditActions.verifyTheActionOptions(['Remove'], 1);
        BulkEditActions.selectAction('Remove', 1);

        // Step 14: Select initial statistical codes to remove
        initialStatisticalCodes.forEach((code) => {
          BulkEditActions.selectStatisticalCodeValue(code.fullName, 1);
        });

        // Step 15: Verify first row action is restricted to "Add"
        BulkEditActions.verifyTheActionOptions(['Add'], 0);

        // Step 16: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        // Verify preview shows new statistical codes
        const expectedNewCodesString = newStatisticalCodes.map((code) => code.fullName).join('|');

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            expectedNewCodesString,
          );
        });

        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

        // Step 17: Download preview
        BulkEditActions.downloadPreview();

        instances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            expectedNewCodesString,
          );
        });

        // Step 18: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            expectedNewCodesString,
          );
        });

        // Step 19: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        instances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            expectedNewCodesString,
          );
        });

        // Step 20-21: Verify changes in Inventory app for all instances
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

        instances.forEach((instance) => {
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify old statistical codes are removed and new ones are added
          newStatisticalCodes.forEach((code) => {
            InstanceRecordView.verifyStatisticalCodeTypeAndName(code.typeName, code.name);
          });

          // Verify initial statistical codes are no longer present
          initialStatisticalCodes.forEach((code) => {
            InstanceRecordView.verifyStatisticalCode(code.name, false);
          });

          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
