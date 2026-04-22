import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let instanceTypeId;
let instanceTypeName;
const numberOfRecords = 9;
const createdInstanceTitles = [];
const invalidInstanceIds = [];
const createdInstanceIds = [];
const createdInstanceHrids = [];
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const instanceHRIDsFileName = `instanceHRIDs-${getRandomPostfix()}.csv`;
const matchedRecordsUUIDsFileName = BulkEditFiles.getMatchedRecordsFileName(
  instanceUUIDsFileName,
  true,
);
const errorsFromMatchingUUIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  instanceUUIDsFileName,
  true,
);
const matchedRecordsHRIDsFileName = BulkEditFiles.getMatchedRecordsFileName(
  instanceHRIDsFileName,
  true,
);
const errorsFromMatchingHRIDsFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  instanceHRIDsFileName,
  true,
);

// generate instance titles and invalid instance ids
for (let i = 1; i <= numberOfRecords; i++) {
  createdInstanceTitles.push(`C423684 instance ${i} ${getRandomPostfix()}`);
  invalidInstanceIds.push(uuid());
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
            instanceTypeName = instanceTypeData[0].name;
          })
          .then(() => {
            createdInstanceTitles.forEach((instanceTitle) => {
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: instanceTitle,
                },
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.wait(1000);
              });
            });
          })
          .then(() => {
            createdInstanceIds.forEach((instanceId) => {
              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
                cy.wait(500);
              });
            });
          })
          .then(() => {
            // Add duplicate valid identifier to test warnings
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${createdInstanceIds.join('\n')}\n${createdInstanceIds[0]}\n${invalidInstanceIds.join('\n')}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${instanceHRIDsFileName}`,
              `${createdInstanceHrids.join('\n')}\n${createdInstanceHrids[0]}\n${invalidInstanceIds.join('\n')}`,
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
      createdInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsUUIDsFileName,
        errorsFromMatchingUUIDsFileName,
        matchedRecordsHRIDsFileName,
        errorsFromMatchingHRIDsFileName,
      );
    });

    it(
      'C423684 Verify "Preview of record matched" in case of uploading valid and invalid Instance identifiers (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423684'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount(`${numberOfRecords} instance`);
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

        createdInstanceHrids.forEach((instanceHrid, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            createdInstanceTitles[index],
          );
        });

        BulkEditSearchPane.verifyErrorLabel(9, 1);

        invalidInstanceIds.forEach((invalidInstanceId) => {
          BulkEditSearchPane.verifyErrorByIdentifier(
            invalidInstanceId,
            ERROR_MESSAGES.NO_MATCH_FOUND,
            'Error',
          );
        });

        // Verify duplicate warning for the repeated valid identifier
        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyErrorByIdentifier(
          createdInstanceIds[0],
          ERROR_MESSAGES.DUPLICATE_ENTRY,
          'Warning',
        );

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            instanceTypeName,
          );
        });

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(true, true);
        BulkEditSearchPane.verifyInstanceActionShowColumns();
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
        );

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
        });

        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
        );

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
            '',
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        createdInstanceIds.forEach((instanceId) => {
          ExportFile.verifyFileIncludes(matchedRecordsUUIDsFileName, [instanceId]);
        });

        BulkEditActions.downloadErrors();

        invalidInstanceIds.forEach((invalidInstanceId) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
            `ERROR,${invalidInstanceId},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
          ]);
        });
        // Verify duplicate warning in CSV
        ExportFile.verifyFileIncludes(errorsFromMatchingUUIDsFileName, [
          `WARNING,${createdInstanceIds[0]},${ERROR_MESSAGES.DUPLICATE_ENTRY}`,
        ]);

        // Step 12: Test with Instance HRIDs
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');

        BulkEditSearchPane.uploadFile(instanceHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceHRIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount(`${numberOfRecords} instance`);
        BulkEditSearchPane.verifyFileNameHeadLine(instanceHRIDsFileName);

        createdInstanceHrids.forEach((instanceHrid, index) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            createdInstanceTitles[index],
          );
        });

        // Step 13: Check the columns in the error table - verify errors and warnings
        BulkEditSearchPane.verifyErrorLabel(9, 1);

        invalidInstanceIds.forEach((invalidInstanceId) => {
          BulkEditSearchPane.verifyErrorByIdentifier(
            invalidInstanceId,
            ERROR_MESSAGES.NO_MATCH_FOUND,
            'Error',
          );
        });

        // Verify duplicate warning for the repeated valid HRID
        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyErrorByIdentifier(
          createdInstanceHrids[0],
          ERROR_MESSAGES.DUPLICATE_ENTRY,
          'Warning',
        );

        // Step 14: Download matched records for HRIDs
        BulkEditActions.downloadMatchedResults();

        createdInstanceHrids.forEach((instanceHrid) => {
          ExportFile.verifyFileIncludes(matchedRecordsHRIDsFileName, [instanceHrid]);
        });

        // Step 15: Download errors for HRIDs
        BulkEditActions.downloadErrors();

        invalidInstanceIds.forEach((invalidInstanceId) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
            `ERROR,${invalidInstanceId},${ERROR_MESSAGES.NO_MATCH_FOUND}`,
          ]);
        });
        // Verify duplicate warning in CSV
        ExportFile.verifyFileIncludes(errorsFromMatchingHRIDsFileName, [
          `WARNING,${createdInstanceHrids[0]},${ERROR_MESSAGES.DUPLICATE_ENTRY}`,
        ]);
      },
    );
  });
});
