import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DataImport from '../../../support/fragments/data_import/dataImport';
import randomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const testData = {
        searchQuery: 'C553014 filter using 2 dates test',
        allDates1Sorted: ['1902', '1903', '1904', '1905', '1906'],
        dateRangeAccordionName: 'Date range',
      };
      const filterData = [
        { range: ['1903', '1905'], dates: testData.allDates1Sorted.slice(1, 4) },
        { range: ['1903', '1903'], dates: testData.allDates1Sorted.slice(1, 2) },
        { range: ['1899', '1999'], dates: testData.allDates1Sorted },
      ];
      const marcFile = {
        marc: 'marcBibFileC553014.mrc',
        fileName: `testMarcFileC553014.${randomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const createdInstanceIds = [];

      before('Create test data, login', () => {
        cy.then(() => {
          cy.getAdminToken();
          // delete existing related instances
          InventoryInstances.getInstancesViaApi({
            limit: 200,
            query: `title="${testData.searchQuery}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        }).then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceIds.push(record[marcFile.propertyName].id);
            });
          });

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C553014 Filter "Instance" records by "Date range" filter using "From" and "To" boxes (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553014'] },
        () => {
          InventoryInstances.searchByTitle(testData.searchQuery);
          testData.allDates1Sorted.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          filterData.forEach((filterDatum) => {
            InventorySearchAndFilter.filterByDateRange(...filterDatum.range);
            filterDatum.dates.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(filterDatum.dates.length);
            InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName, false);
          });
          testData.allDates1Sorted.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(testData.allDates1Sorted.length);
          InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName);
          InventorySearchAndFilter.verifyDateRangeAccordionValues(...filterData[2].range);
          testData.allDates1Sorted.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(testData.allDates1Sorted.length);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
        },
      );
    });
  });
});
