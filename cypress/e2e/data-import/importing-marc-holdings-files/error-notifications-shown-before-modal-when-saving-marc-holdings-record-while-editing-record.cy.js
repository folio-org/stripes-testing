import { JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const jobProfileForCreatingInstance = 'Default - Create instance and SRS MARC Bib';
    const filePathForUpload = 'marcFileForC375187.mrc';
    const filePathForEdit = 'marcFileForC375187_holdings.mrc';
    const fileName = `C375187 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C375187 editedAutotestFileName.${getRandomPostfix()}`;
    const jobProfileForCreatingHoldings = 'Default - Create Holdings and SRS MARC Holdings';

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance, holding and item
        DataImport.uploadFile(filePathForUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreatingInstance);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
          InventoryInstances.searchBySource('MARC');
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceSource('MARC');

          DataImport.editMarcFile(
            filePathForEdit,
            editedMarcFileName,
            ['in00000000023'],
            [instanceHrid],
          );

          // upload a marc file for creating holdings
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForCreatingHoldings);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(editedMarcFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(editedMarcFileName);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.holdings,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
          });
          cy.logout();
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);

      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C375187 Error notifications shown before modals when saving "MARC holdings" record while editing record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstances.searchBySource('MARC');
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyInstanceSource('MARC');

        // #1 Input query in search input field which will return at least one "Instance" record with assigned "MARC holdings" record.
        // For example: "The Journal of ecclesiastical history."
        // Search results corresponding to search queary displayed in second pane.

        // #2 Click on row in second pane with "Instance" record with assigned "MARC holdings" record.
        // For example: with "Title"="The Journal of ecclesiastical history."
        // Detail view for selected "MARC bibliographic" record is opened in third pane.

        // #3 Click "View holdings" button in the third pane.
        // Detail view pane of "MARC Holdings" record is opened.

        // #4 Click on the "Actions" button and select the "Edit in quickMARC" option from the expanded dopdown.
        // The editing window of "MARC Holdings" record has been opened.

        // #5 Delete any field.
        // For example, delete "866" field.
        // * The placeholder message is displayed instead of deleted field.
        // * The "Save & keep editing" and "Save & close" buttons became enabled.

        // #6 Delete the last character of "LDR" field.
        // 23 characters are displayed in the "LDR" field.

        // #7 Update any field with valid value.
        // For example, add " TEST" to existing value in "035" field.
        // Update value is shown in updated field.

        // #8 Input "0" in tag box (first box) for any field.
        // For example, for "040" field.
        // * "0" value is shown for the updated tag box.

        // #9 Click "Save & close" button.
        // * "Record cannot be saved. The Leader must contain 24 characters, including null spaces." error toast notification appears at the bottom right of the screen.
        // * The editing window of "MARC holdings" record remains opened.

        // #10 Input deleted value in "LDR" field.
        // 24 characters are displayed in the "LDR" field.
        // For example, "00506cy\\a22001574\\4500".

        // #11 Click "Save & close" button.
        // * "Record cannot be saved. A MARC tag must contain three characters." error toast notification appears at the bottom right of the screen.
        // * The editing window of "MARC Holdings" record remains opened.

        // #12 Input original tag value for field updated in Step 8.
        // For example, input "040" tag for field with tag "0".
        // Original tag value is shown in field.

        // #13 Click "Save & keep editing" button.
        // * "Delete fields" modal appears with following text:
        //  * "By selecting Continue with save, then 1 field(s) will be deleted and this record will be updated. Are you sure you want to continue?"

        // #14 Click "Restore deleted field(s)" button in modal.
        // * Modal is closed.
        // * Placeholder is replaced by restored field (for example, "866" field).
        // * The "Save & keep editing" and "Save & close" buttons are enabled.
      },
    );
  });
});
