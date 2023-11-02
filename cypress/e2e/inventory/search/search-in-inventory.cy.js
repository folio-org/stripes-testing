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
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('Search in Inventory', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileNameForC360548 = `testInventoryFile.${getRandomPostfix()}.mrc`;
  const fileNameForC360555 = `testInventoryFile.${getRandomPostfix()}.mrc`;
  const createdInstanceIDs = [];

  before('Creating data', () => {
    cy.createTempUser([Permissions.moduleDataImportEnabled.gui, Permissions.inventoryAll.gui]).then(
      (createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      },
    );
    cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
      (createdUserProperties) => {
        testData.userPropertiesC358938 = createdUserProperties;
      },
    );
  });

  beforeEach('Creating data', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    Users.deleteViaApi(testData.userPropertiesC358938.userId);
    createdInstanceIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C360548 Verify that operator "=" is used when user search for "Instance" by "Contributor" search option. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const searchQueries = [
        'Henri Sauguet',
        'Sauguet, Henri, 1901-1989',
        'Henri Sauguet 1901-1989',
      ];

      DataImport.uploadFile('Sauguet_Henri_5_Bib_records.mrc', fileNameForC360548);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForC360548);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForC360548);
      for (let i = 0; i < 5; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      }

      cy.visit(TopMenu.inventoryPath);

      InventorySearchAndFilter.selectSearchOptions('Contributor', 'Sauguet, Henri');
      InventorySearchAndFilter.checkContributorRequest();
      InventorySearchAndFilter.checkContributorsColumResult('Sauguet');
      InventorySearchAndFilter.checkContributorsColumResult('Henri');
      // The resetAll button is used because the reset search input is very unstable
      InventorySearchAndFilter.resetAll();

      searchQueries.forEach((query) => {
        InventorySearchAndFilter.selectSearchOptions('Contributor', query);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.checkContributorsColumResult('Sauguet');
        InventorySearchAndFilter.checkContributorsColumResult('Henri');
        if (query.includes('1901-1989')) InventorySearchAndFilter.checkContributorsColumResult('Henri');
        InventorySearchAndFilter.resetAll();
      });
    },
  );

  it(
    'C360555 Verify that search for "Instance" records by "Keyword" option with "<ISBN with dashes>" query will only return the records with matched identifier value. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const searchQueries = ['978-92-8000-565-9', '978-92-8011-565-9'];

      DataImport.uploadFile('two_bib_records_with_isbn_search_by_keyword.mrc', fileNameForC360555);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForC360555);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileNameForC360555);
      for (let i = 0; i < 2; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      }

      cy.visit(TopMenu.inventoryPath);

      searchQueries.forEach((query) => {
        InventorySearchAndFilter.selectSearchOptions(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          query,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(
          '"Closer to the truth than any fact" : memoir, memory, and Jim Crow / Jennifer Jensen Wallach.',
        );
        InventorySearchAndFilter.checkMissingSearchResult(
          'Chopsticks only works in pairs (test) 9',
        );
        InventorySearchAndFilter.selectSearchResultItem();
        // Wait for details section reload and show updated ISBN number in Identifiers accordion.
        cy.wait(1000);
        InventoryInstance.checkIdentifier(query);
        InventorySearchAndFilter.resetAll();
      });
    },
  );

  it(
    'C358938 Verify that "Instance" record will close when user switches to browse (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(testData.userPropertiesC358938.username, testData.userPropertiesC358938.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle('*');
      InventoryInstances.waitLoading();
      InventoryInstances.selectInstance();
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyCallNumberBrowsePane();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
    },
  );
});
