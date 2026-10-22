import { DEFAULT_JOB_PROFILE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceId;
    let regularImportInstanceId;
    const marcInstanceTitle = `AT_C594486_MarcBibInstance_${getRandomPostfix()}`;
    const actionNote = 'AT_C594486 bulk edit action note';
    const instanceUUIDsFileName = `AT_C594486_instanceUUIDs_${getRandomPostfix()}.csv`;
    const regularImportFileName = `AT_C594486_RegularImportFile_${getRandomPostfix()}.mrc`;
    const regularImportTitle = `AT_C594486_RegularImportInstance_${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((createdInstanceId) => {
        instanceId = createdInstanceId;
        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instanceId);
      });

      // Regular Data Import job, run beforehand, so the log lists are guaranteed to have at
      // least one row - otherwise "the Bulk edit job is not displayed" would trivially pass on
      // an empty list without proving anything.
      cy.then(() => {
        DataImport.createMarcFile({
          fileName: regularImportFileName,
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          fields: [{ tag: '245', indicators: ['0', '0'], content: `$a ${regularImportTitle}` }],
        });
      });
      cy.then(() => {
        DataImport.uploadFileViaApi(
          regularImportFileName,
          regularImportFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          regularImportInstanceId = response[0].instance.id;
        });
      });

      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Precondition (C503070): run a "Bulk edit - Instances with source MARC" job to
        // completion, so the Data Import log views have a Bulk edit job to (not) show.
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('583', '0', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.fillInDataTextAreaForMarcInstance(actionNote);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${regularImportFileName}`);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
        InventoryInstance.deleteInstanceViaApi(regularImportInstanceId);
      });
    });

    it(
      'C594486 Bulk edit jobs is not visible on Data Import landing page or "view all logs" page (promin)',
      { tags: ['extendedPath', 'promin', 'C594486'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        // Step 1: the regular import shows (list is not just empty), the Bulk edit job does not
        Logs.waitFileIsImported(regularImportFileName);
        cy.get('#job-logs-list').should('not.contain.text', instanceUUIDsFileName);

        // Step 2: Actions -> View all logs - same: regular import present, Bulk edit job absent
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.verifySearchResult(regularImportFileName);
        cy.get('#list-data-import').should('not.contain.text', instanceUUIDsFileName);
      },
    );
  });
});
