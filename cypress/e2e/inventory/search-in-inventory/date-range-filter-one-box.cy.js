import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        searchQuery: `AT_C553018_FolioInstance_${randomPostfix}`,
        allDates1: ['1902', '1903', '1904', '1905', '1906'],
        allDates2: ['', '2021', '2022', '2022', ''],
        dateRangeAccordionName: 'Date range',
      };
      const filterData = [
        { range: ['1904', ''], dates: testData.allDates1.slice(2) },
        { range: ['', '1904'], dates: testData.allDates1.slice(0, 3) },
      ];
      const createdInstanceIds = [];

      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C553018');
        cy.then(() => {
          cy.getInstanceDateTypesViaAPI().then((dateTypesResponse) => {
            testData.allDates1.forEach((date1, index) => {
              InventoryInstance.createInstanceViaApi({
                instanceTitle: `${testData.searchQuery}_${index}`,
              }).then(({ instanceData }) => {
                createdInstanceIds.push(instanceData.instanceId);
                cy.getInstanceById(instanceData.instanceId).then((body) => {
                  const updatedBody = { ...body };
                  updatedBody.dates = {
                    dateTypeId: dateTypesResponse.instanceDateTypes[index].id,
                    date1,
                    date2: testData.allDates2[index],
                  };
                  cy.updateInstance(updatedBody);
                });
              });
            });
          });
        }).then(() => {
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
        'C553018 Filter "Instance" records by "Date range" filter using one box ("From" / "To") (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553018'] },
        () => {
          InventoryInstances.searchByTitle(testData.searchQuery);
          testData.allDates1.forEach((date) => {
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

          InventorySearchAndFilter.clearFilter(testData.dateRangeAccordionName);
          testData.allDates1.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(testData.allDates1.length);
          InventorySearchAndFilter.toggleAccordionByName(testData.dateRangeAccordionName);
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
        },
      );
    });
  });
});
