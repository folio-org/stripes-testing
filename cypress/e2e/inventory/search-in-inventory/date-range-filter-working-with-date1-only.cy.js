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
        searchQuery: `AT_C553030_FolioInstance_${randomPostfix}`,
        allDates1: ['1955', '1954', ''],
        allDates2: ['2022', '1955', '1956'],
        dateRangeAccordionName: 'Date range',
      };
      const filterData = { range: ['1955', '2022'], dates: [testData.allDates1[0]] };
      const createdInstanceIds = [];

      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C553030');
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
        'C553030 Verify that "Date range" filter is working on "Date 1" field only (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553030'] },
        () => {
          InventoryInstances.searchByTitle(testData.searchQuery);
          testData.allDates1.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(testData.allDates1.length);

          InventorySearchAndFilter.filterByDateRange(...filterData.range);
          filterData.dates.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(filterData.dates.length);
        },
      );
    });
  });
});
