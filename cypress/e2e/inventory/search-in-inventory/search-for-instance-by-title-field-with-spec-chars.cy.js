import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  searchQueries: [
    'Harry Potter the cursed child Parts one, two',
    'Harry Potter : the cursed child Parts one, two',
    'Harry Potter : the cursed child Parts one, two',
    'Harry Potter / the cursed child Parts one, two',
    'Harry Potter&the-cursed child: Parts one/ two',
    'the cursed child : Harry Potter',
    'Harry Potter and the cursed child Parts one, two',
    'Harry Potter - the cursed child Parts one, two',
    'Harry Potter & the cursed child; Parts one, two\\',
  ],
  titleSearchQuery: 'Harry Potter the cursed child Parts one, two\\',
  searchResults: [
    'Harry Potter and the cursed child Parts one, two',
    'Harry Potter & the cursed child; Parts one, two',
    'Harry Potter : the cursed child Parts one, two.',
    '"Harry Potter" / the cursed child {Parts one, two}',
    '.Harry Potter - the cursed child [Parts] one, two !',
    'Harry Potter & the cursed child : Parts one / two, (a new play by writer Jack Thorne).',
    'Harry Potter the cursed child Parts one two',
    'Harry Potter&the cursed child: Parts one/ two',
  ],
  titleSearchOption: 'Title (all)',
  marcFile: {
    marc: 'marcBibC368027.mrc',
    fileName: `testMarcFileC368027.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 8,
    propertyName: 'instance',
  },
  queryForDelete: 'Harry Potter',
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 20,
        query: `title="${testData.queryForDelete}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C368027 Search for "Instance" by "Title" field with special characters using "Keyword" and "Title (all) search options (spitfire) (TaaS)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C368027', 'eurekaPhase1'] },
      () => {
        testData.searchQueries.forEach((query) => {
          cy.ifConsortia(() => {
            InventorySearchAndFilter.byShared('No');
          });
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(8);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        cy.ifConsortia(() => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.searchByTitle(
          'Harry Potter & the cursed child : Parts one / two, (a new play by writer Jack Thorne).',
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.searchInstancesWithOption(
          testData.titleSearchOption,
          testData.titleSearchQuery,
        );
        InventorySearchAndFilter.checkRowsCount(8);
        testData.searchResults.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );
  });
});
