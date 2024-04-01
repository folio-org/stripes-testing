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
  ],
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
  marcFile: {
    marc: 'marcBibC368027.mrc',
    fileName: `testMarcFileC368027.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 8,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
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
      'C368027 Search for "Instance" by "Title" field with special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'eurekaPhase1'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(8);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        InventoryInstances.searchByTitle('Harry Potter and the cursed child Parts one, two');
        InventorySearchAndFilter.checkRowsCount(3);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[1], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTitle(
          'Harry Potter & the cursed child : Parts one / two, (a new play by writer Jack Thorne).',
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTitle('Harry Potter - the cursed child Parts one, two', false);
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
