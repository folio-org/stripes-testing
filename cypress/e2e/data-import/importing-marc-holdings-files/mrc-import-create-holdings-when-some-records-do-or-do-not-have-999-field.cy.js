import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileName = `C359209 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C359209 editedMarcFile.${getRandomPostfix()}.mrc`;
    const error =
      '{"error":"A new MARC-Holding was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFile(filePathForUpload, fileName);
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.openFileDetails(fileName);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;
      });
      cy.logout();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.settingsTenantViewLocation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
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
      'C359209 Checking the import to Create MARC Holdings records, when some incoming records do or do not have 999 ff fields (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        DataImport.editMarcFile(
          'marcFileForC359209.mrc',
          editedMarcFileName,
          ['test1', 'test2', 'test3', 'test4'],
          [instanceHrid, instanceHrid, instanceHrid, instanceHrid],
        );

        // upload a marc file for creating holdings
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.search('Default - Create Holdings and SRS MARC Holdings');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(editedMarcFileName);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName, 1);
        });
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
          2,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
          3,
        );
        // check created counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkHoldingsQuantityInSummaryTable('1');
        // check No action counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable('3', 2);
        // check Error counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable('3', 3);
        FileDetails.verifyErrorMessage(error);
      },
    );
  });
});
