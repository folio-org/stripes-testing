import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const instanceTitle = 'The Journal of ecclesiastical history.';
    const jobProfileForCreatingInstance = 'Default - Create instance and SRS MARC Bib';
    const jobProfileForCreatingHoldings = 'Default - Create Holdings and SRS MARC Holdings';
    const filePathForUpload = 'marcFileForC356820.mrc';
    const filePathForEdit = 'marcFileForC356820_holdings.mrc';
    const fileName = `C356802 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C356802 editedAutotestFileName.${getRandomPostfix()}`;
    const changesSavedCallout =
      'This record has successfully saved and is in process. Changes may not appear immediately.';

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFile(filePathForUpload, fileName);
      JobProfiles.search(jobProfileForCreatingInstance);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.openFileDetails(fileName);
      FileDetails.openInstanceInInventory('Created');
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
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
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
        FileDetails.openHoldingsInInventory('Created');
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
