import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const fileName = `C11119 autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC11119.mrc';
    const title = 'The Journal of ecclesiastical history.';
    const resourceIdentifier = { type: 'System control number', value: '366832' };

    before('login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C11119 Check that the Instance HRID assigned as MARC Bib 001 when Inventory Instance created via Data Import (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // upload a marc file
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(jobProfileToRun);
        Logs.openFileDetails(fileName);
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceHridValue(instanceHrid);
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifier.type,
            resourceIdentifier.value,
            5,
          );
        });
      },
    );
  });
});
