import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

let user;
const instanceHRIDsFileName = `instanceHRIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceHRIDsFileName, true);
const testInstance = {
  title: `AT_C423697_Instance_${getRandomPostfix()}`,
  contributors: [
    { name: 'Contributor 1', primary: null },
    { name: 'Contributor 2', contributorNameTypeId: null, primary: null },
    {
      name: 'Contributor 3',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 3',
      primary: null,
    },
    {
      name: 'Contributor 4',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 4',
      primary: true,
    },
    {
      name: 'Contributor 5',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 5',
      primary: null,
    },
    {
      name: 'Contributor 6',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 6',
      primary: null,
    },
    {
      name: 'Contributor 7',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 7',
      primary: null,
    },
    {
      name: 'Contributor 8',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 8',
      primary: null,
    },
    {
      name: 'Contributor 9',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 9',
      primary: null,
    },
    {
      name: 'Contributor 10',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 10',
      primary: null,
    },
    {
      name: 'Contributor 11',
      contributorNameTypeId: null,
      contributorTypeId: null,
      contributorTypeText: 'Type text 11',
      primary: null,
    },
  ],
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

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          const instanceTypeId = instanceTypeData[0].id;

          // Get contributor name types and contributor types for proper setup
          BrowseContributors.getContributorNameTypes().then((nameTypes) => {
            const contributorNameTypeId = nameTypes[0].id;

            BrowseContributors.getContributorTypes({ searchParams: { limit: 200 } }).then(
              (contributorTypes) => {
                // Setup contributors with proper IDs where specified
                testInstance.contributors.forEach((contributor, index) => {
                  contributor.contributorNameTypeId = contributorNameTypeId;

                  if (index) {
                    contributor.contributorTypeId = contributorTypes[index].id;
                  }
                });

                // Create instance with contributors
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: testInstance.title,
                    contributors: testInstance.contributors,
                  },
                }).then((createdInstanceData) => {
                  testInstance.instanceId = createdInstanceData.instanceId;

                  // Get HRID for the instance
                  cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                    testInstance.instanceHrid = instance.hrid;

                    // Create CSV file with instance HRID
                    FileManager.createFile(
                      `cypress/fixtures/${instanceHRIDsFileName}`,
                      testInstance.instanceHrid,
                    );
                  });
                });
              },
            );
          });
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
      InventoryInstance.deleteInstanceViaApi(testInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C423697 Verify rendering Instance record Contributors in bulk edit forms and files (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423697'] },
      () => {
        // Expected Contributors display format (names only, semicolon-separated)
        const expectedContributorsDisplay = testInstance.contributors
          .map((contributor) => contributor.name)
          .join('; ');

        // Step 1: Select "Inventory - instances" radio button and "Instance HRIDs" option
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');

        // Step 2: Upload .csv file with Instance HRID
        BulkEditSearchPane.uploadFile(instanceHRIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check upload result
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testInstance.instanceHrid,
        );

        // Step 4: Show Contributors column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
        );

        // Step 5: Verify Contributors display in preview table
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );

        // Step 6: Download matched records and verify Contributors in CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );

        // Step 7: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        // Step 8: Verify Contributors display in "Preview of records to be changed"
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 9: Download preview and verify Contributors in CSV
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);

        // Step 11: Verify Contributors display in "Preview of record changed"
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 12: Download changed records and verify Contributors in CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
          expectedContributorsDisplay,
        );
      },
    );
  });
});
