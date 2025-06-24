import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { APPLICATION_NAMES, LOCATION_IDS, LOCATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
const invalidInstanceHRID = `123-${getRandomPostfix()}`;
const validAndInvalidInstanceHRIDsFileName = `validAndInvalidInstanceHRIDS-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validAndInvalidInstanceHRIDsFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${validAndInvalidInstanceHRIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${validAndInvalidInstanceHRIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validAndInvalidInstanceHRIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${validAndInvalidInstanceHRIDsFileName}`;

const instance = {
  barcode: `456-${getRandomPostfix()}`,
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};
const instance2 = {
  barcode: `789-${getRandomPostfix()}`,
  instanceName: `testBulkEdit2_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.getAdminToken().then(() => {
              instance.id = InventoryInstances.createInstanceViaApi(
                instance.instanceName,
                instance.barcode,
              );
              instance2.id = InventoryInstances.createInstanceViaApi(
                instance2.instanceName,
                instance2.barcode,
              );
              cy.getHoldings({ limit: 1, query: `"instanceId"="${instance.id}"` }).then(
                (holdings) => {
                  instance.holdingUUID = holdings[0].id;
                  delete holdings[0].temporaryLocationId;
                  cy.updateHoldingRecord(holdings[0].id, {
                    ...holdings[0],
                    permanentLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
                  });
                },
              );
              cy.getHoldings({ limit: 1, query: `"instanceId"="${instance2.id}"` }).then(
                (holdings) => {
                  instance2.holdingUUID = holdings[0].id;
                  cy.updateHoldingRecord(holdings[0].id, {
                    ...holdings[0],
                    temporaryLocationId: LOCATION_IDS.MAIN_LIBRARY,
                    permanentLocationId: LOCATION_IDS.ONLINE,
                  });
                },
              );
              cy.getInstanceById(instance.id).then((res) => {
                instance.hrid = res.hrid;
              });
              cy.getInstanceById(instance2.id)
                .then((res) => {
                  instance2.hrid = res.hrid;
                })
                .then(() => {
                  FileManager.createFile(
                    `cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`,
                    `${instance.hrid}\n${instance2.hrid}\n${invalidInstanceHRID}`,
                  );
                });
            });
          })
          .then(() => {
            cy.wait(5000);
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.barcode);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance2.barcode);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          validAndInvalidInstanceHRIDsFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
          errorsFromCommittingFileName,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C375298 Verify generated Logs files for Holdings In app -- valid and invalid records (firebird)',
        { tags: ['smoke', 'firebird', 'C375298'] },
        () => {
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');

          BulkEditSearchPane.uploadFile(validAndInvalidInstanceHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.downloadMatchedResults();
          BulkEditActions.downloadErrors();
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.clearTemporaryLocation('holdings', 0);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.replacePermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION,
            'holdings',
            1,
          );

          BulkEditActions.confirmChanges();
          BulkEditActions.downloadPreview();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditActions.downloadErrors();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrors();

          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(validAndInvalidInstanceHRIDsFileName, [
            instance.hrid,
            instance2.hrid,
            invalidInstanceHRID,
          ]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(`*${matchedRecordsFileName}`, [
            instance.holdingUUID,
            instance2.holdingUUID,
          ]);

          BulkEditLogs.downloadFileWithErrorsEncountered();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [invalidInstanceHRID]);

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            ['', ''],
            'temporaryLocation',
            true,
          );
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            [
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
            ],
            'permanentLocation',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            ['', ''],
            'temporaryLocation',
            true,
          );
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [LOCATION_NAMES.POPULAR_READING_COLLECTION_UI],
            'permanentLocation',
            true,
          );

          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [instance.hrid]);

          // Go to inventory app and verify changes
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchByParameter('Instance HRID', instance.hrid);
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
          );
          InventoryInstance.verifyHoldingsTemporaryLocation('-');
          InventoryInstance.closeHoldingsView();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchByParameter('Instance HRID', instance2.hrid);
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
          );
          InventoryInstance.verifyHoldingsTemporaryLocation('-');
        },
      );
    });
  });
});
