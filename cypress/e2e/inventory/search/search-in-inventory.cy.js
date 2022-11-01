import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch'

describe('Search in Inventory', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  let fileName = `testInventoryFile.${getRandomPostfix()}.mrc`;
  let createdInstanceIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.uploadFile('Sauguet_Henri_5_Bib_records.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 5; i++) {
        Logs.getCreatedItemsID(i).then(link => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      }

      cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventorySearch.waitLoading });
    });
  });

  afterEach('Deleting data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdInstanceIDs.forEach(id => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it('C360548 Verify that operator "=" is used when user search for "Instance" by "Contributor" search option. (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    const searchQueries = ['Henri Sauguet', 'Sauguet, Henri, 1901-1989', 'Henri Sauguet 1901-1989'];

    InventorySearch.selectSearchOptions('Contributor', 'Sauguet, Henri');
    InventorySearch.checkContributorRequest();
    InventorySearch.checkContributorsColumResult('Sauguet');
    InventorySearch.checkContributorsColumResult('Henri');
    // The resetAll button is used because the reset search input is very unstable
    InventorySearch.resetAll();

    searchQueries.forEach(query => {
      InventorySearch.selectSearchOptions('Contributor', query);
      InventorySearch.clickSearch();
      InventorySearch.checkContributorsColumResult('Sauguet');
      InventorySearch.checkContributorsColumResult('Henri');
      if (query.includes('1901-1989')) InventorySearch.checkContributorsColumResult('Henri');
      InventorySearch.resetAll();
    });
  });
});