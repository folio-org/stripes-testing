import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {};
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const fileNameForC360548 = `testInventoryFile.${getRandomPostfix()}.mrc`;
    const fileNameForC360555 = `testInventoryFile.${getRandomPostfix()}.mrc`;
    const propertyName = 'instance';
    const createdInstanceIDs = [];

    before('Creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      });
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
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      Users.deleteViaApi(testData.userPropertiesC358938.userId);
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C360548 Verify that operator "=" is used when user search for "Instance" by "Contributor" search option. (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C360548'] },
      () => {
        const searchQueries = [
          'Henri Sauguet',
          'Sauguet, Henri, 1901-1989',
          'Henri Sauguet 1901-1989',
        ];
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          'Sauguet_Henri_5_Bib_records.mrc',
          fileNameForC360548,
          jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdInstanceIDs.push(record[propertyName].id);
          });
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

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
      { tags: ['criticalPathFlaky', 'spitfire', 'C360555'] },
      () => {
        const searchQueries = ['978-92-8000-565-9', '978-92-8011-565-9'];
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          'two_bib_records_with_isbn_search_by_keyword.mrc',
          fileNameForC360555,
          jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdInstanceIDs.push(record[propertyName].id);
          });
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

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
      { tags: ['criticalPath', 'spitfire', 'C358938', 'eurekaPhase1'] },
      () => {
        cy.login(testData.userPropertiesC358938.username, testData.userPropertiesC358938.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        cy.ifConsortia(false, () => {
          InventoryInstances.searchByTitle('*');
        });
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
});
