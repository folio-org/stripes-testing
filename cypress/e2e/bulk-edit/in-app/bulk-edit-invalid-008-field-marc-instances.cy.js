import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

let user;
let marcInstanceId;
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const marcFileName = 'marcBibC850013.mrc';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          marcFileName,
          `marcBibInvalid008_${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          response.forEach((record) => {
            marcInstanceId = record.instance.id;
          });

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, marcInstanceId);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    // Trillium
    it.skip(
      'C850013 Verify preventing bulk edit of MARC Instances with invalid 008 field in MARC record (firebird)',
      { tags: [] },
      () => {
        // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" from dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload CSV file with Instance UUIDs of MARC instances with invalid 008 field
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the CSV file
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
        BulkEditSearchPane.verifyErrorLabel(1, 0);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

        // Step 4: Check the columns in the "Errors & warnings" accordion
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceId,
          ERROR_MESSAGES.INVALID_MARC_RECORD,
        );

        // Step 5: Click "Actions" menu
        BulkEditActions.openActions();
        BulkEditSearchPane.searchColumnNameTextfieldAbsent();

        // Step 6: Download errors CSV file
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
          'ERROR',
          marcInstanceId,
          ERROR_MESSAGES.INVALID_MARC_RECORD,
        ]);
      },
    );
  });
});
