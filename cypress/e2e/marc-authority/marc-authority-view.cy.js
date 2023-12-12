import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';

import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../support/utils/stringTools';

describe('MARC Authority management', () => {
  const userData = {};
  let instanceID;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.inventoryAll.gui,
    ]).then((createdUserProperties) => {
      userData.id = createdUserProperties.userId;
      userData.firstName = createdUserProperties.firstName;
      userData.name = createdUserProperties.username;
      userData.password = createdUserProperties.password;

      cy.loginAsAdmin();
      cy.visit(TopMenu.dataImportPath);
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry('oneMarcBib.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID(0).then((link) => {
        instanceID = link.split('/')[5];
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.id);

    InventoryInstance.deleteInstanceViaApi(instanceID);
  });

  it(
    'C350967 quickMARC: View MARC bibliographic record (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel'] },
    () => {
      cy.login(userData.name, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(instanceID);
      InventoryInstances.selectInstance();
      InventoryInstance.getId().then((id) => {
        instanceID = id;
      });
      InventoryInstance.checkExpectedMARCSource();
      // Wait for the content to be loaded.
      cy.wait(2000);
      InventoryInstance.checkMARCSourceAtNewPane();
    },
  );
});
