import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const filePath = 'marcFileForC2361.mrc';
    const marcFileName = `C2361 autotestFileName ${getRandomPostfix()}`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const title = "101 things I wish I'd known when I started";

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });

        // upload a mrc file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(jobProfileToRun);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);

        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C2361 Disallow editing of Instance records that have underlying SRS MARC records',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        Logs.openFileDetails(marcFileName);
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          instanceHrid = hrid;
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.edit();
          InstanceRecordEdit.checkReadOnlyFields();
        });
      },
    );
  });
});
