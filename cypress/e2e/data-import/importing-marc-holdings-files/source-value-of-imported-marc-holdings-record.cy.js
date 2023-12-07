import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const instanceTitle = 'The Journal of ecclesiastical history.';
    const jobProfileForCreatingInstance = 'Default - Create instance and SRS MARC Bib';
    const jobProfileForCreatingHoldings = 'Default - Create Holdings and SRS MARC Holdings';
    const filePathForUpload = 'marcFileForC356820.mrc';
    const filePathForEdit = 'marcFileForC356820_holdings.mrc';
    const fileName = `C356820autotestFileName.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C356820editedAutotestFileName.${getRandomPostfix()}.mrc`;
    const changesSavedCallout =
      'This record has successfully saved and is in process. Changes may not appear immediately.';

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFile(filePathForUpload, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileForCreatingInstance);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.openFileDetails(fileName);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;
      });
      cy.logout();

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiTenantSettingsSettingsLocation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C356820 Check the "Source" value of imported "MARC Holdings" record. (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstances.searchBySource('MARC');
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyInstanceSource('MARC');
        DataImport.editMarcFile(
          filePathForEdit,
          editedMarcFileName,
          ['in00000000012'],
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
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.checkInstanceTitle(instanceTitle);
        HoldingsRecordView.checkLastUpdatedDate(user.username);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkContent('$9 000442923', 6);
        QuickMarcEditor.checkPaneheaderContains(`Source: ${user.username}`);
        QuickMarcEditor.addValuesToExistingField(
          7,
          '852',
          '$b E $h BR140 $i .J86 $x dbe=c $z Current issues in Periodicals Room $x CHECK-IN RECORD CREATED $9 Test',
          '0',
          '1',
        );
        cy.wait(2000);
        QuickMarcEditor.pressSaveAndKeepEditing(changesSavedCallout);
      },
    );
  });
});
