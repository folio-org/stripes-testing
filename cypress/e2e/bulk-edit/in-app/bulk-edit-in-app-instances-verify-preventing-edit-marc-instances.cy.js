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
let marcInstanceIdC850013;
let marcInstanceIdC692112;
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const marcFileNameC850013 = 'marcBibC850013.mrc';
const marcFileNameC692112 = 'marcBibC692112.mrc';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Import MARC file for C850013 (invalid 008 field)
        DataImport.uploadFileViaApi(
          marcFileNameC850013,
          `marcBibInvalid008_${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          marcInstanceIdC850013 = response[0].instance.id;
        });

        // Import MARC file for C692112 (missing SRS record)
        DataImport.uploadFileViaApi(
          marcFileNameC692112,
          `marcBibMissingSRS_${getRandomPostfix()}.mrc`,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          marcInstanceIdC692112 = response[0].instance.id;

          // Update SRS record state to OLD to create corrupted MARC Instance
          cy.getSrsRecordsByInstanceId(marcInstanceIdC692112).then((srsRecord) => {
            const updatedSrsRecord = {
              ...srsRecord,
              state: 'OLD',
            };
            cy.updateSrsRecord(srsRecord.id, updatedSrsRecord);
          });

          const instanceIds = `${marcInstanceIdC850013}\n${marcInstanceIdC692112}`;

          FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instanceIds);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstanceIdC850013);
      InventoryInstance.deleteInstanceViaApi(marcInstanceIdC692112);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C850013, C692112 Verify preventing bulk edit of MARC Instances with invalid 008 field in MARC record and missing or old status underlying SRS record (firebird)',
      { tags: ['extendedPath', 'firebird', 'C850013', 'C692112'] },
      () => {
        // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" from dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload CSV file with Instance UUIDs of MARC instances with invalid 008 field
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the CSV file
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
        BulkEditSearchPane.verifyErrorLabel(2, 0);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

        // Step 4: Check the columns in the "Errors & warnings" accordion
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceIdC850013,
          ERROR_MESSAGES.INVALID_MARC_RECORD,
        );
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceIdC692112,
          ERROR_MESSAGES.MISSING_SRS_RECORD,
        );

        // Step 5: Click "Actions" menu
        BulkEditActions.openActions();
        BulkEditSearchPane.searchColumnNameTextfieldAbsent();

        // Step 6: Download errors CSV file
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [
          `ERROR,${marcInstanceIdC850013},${ERROR_MESSAGES.INVALID_MARC_RECORD}`,
          `ERROR,${marcInstanceIdC692112},${ERROR_MESSAGES.MISSING_SRS_RECORD}`,
        ]);
      },
    );
  });
});
