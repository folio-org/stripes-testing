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
let statisticalCode;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const administrativeNote = 'Deleted Instance';
const folioInstance = {
  title: `AT_C729186_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C729186_MarcInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get statistical codes for bulk edit
        cy.getStatisticalCodes({ limit: 1 }).then((code) => {
          statisticalCode = code[0];
          cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
            statisticalCode.typeName = codeTypes.filter(
              (item) => item.id === statisticalCode.statisticalCodeTypeId,
            )[0].name;
            statisticalCode.fullName = `${statisticalCode.typeName}: ${statisticalCode.code} - ${statisticalCode.name}`;
          });
        });

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create FOLIO instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
                deleted: true,
                discoverySuppress: true,
                staffSuppress: true,
              },
            }).then((createdInstanceData) => {
              folioInstance.instanceId = createdInstanceData.instanceId;

              // Get HRID for the FOLIO instance
              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstance.instanceHrid = instance.hrid;
              });
            });

            // Create MARC instance
            cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
              marcInstance.instanceId = instanceId;

              cy.getInstanceById(instanceId).then((instance) => {
                marcInstance.instanceHrid = instance.hrid;

                // Set MARC instance for deletion
                instance.deleted = true;
                instance.discoverySuppress = true;
                instance.staffSuppress = true;
                cy.updateInstance(instance);
              });
            });
          })
          .then(() => {
            // Create CSV file with deleted instance UUIDs
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
      'C729186 Verify bulk edit of deleted Instances via FOLIO flow (firebird)',
      { tags: ['criticalPath', 'firebird', 'C729186'] },
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

        // Step 4: Download matched records
        BulkEditActions.downloadMatchedResults();

        instances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
          );
        });

        // Step 5: Start bulk edit for FOLIO Instances
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Step 6: Select "Administrative note" option and "Add note" action
        BulkEditActions.addItemNote('Administrative note', administrativeNote);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Add "Statistical code" option
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Statistical code', 1);
        BulkEditActions.selectSecondAction('Add', 1);
        BulkEditActions.selectStatisticalCodeValue(statisticalCode.fullName, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: administrativeNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            value: statisticalCode.fullName,
          },
        ];

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

        // Step 9: Download preview
        BulkEditActions.downloadPreview();

        instances.forEach((instance) => {
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);

        instances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        // Step 11: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        instances.forEach((instance) => {
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        // Step 12: Verify changes in Inventory app for all deleted instances
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

        instances.forEach((instance) => {
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify instance remains deleted and changes have been applied
          InstanceRecordView.verifyInstanceIsSetForDeletion(true);
          InstanceRecordView.verifyAdministrativeNote(administrativeNote);
          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            statisticalCode.typeName,
            statisticalCode.name,
          );
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
