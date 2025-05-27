import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const randomLetters = getRandomLetters(7);
      const testData = {
        callNumberNotNormalizedOption: 'Call number, not normalized',
        callNumbeNormalizedOption: 'Call number, normalized',
        allOption: 'All',
        instances: [
          {
            title: 'C466078 Instance 1, Holdings call number lower case',
            callNumber: `case sensitive check h ${randomLetters}`,
            barcode: `466078${uuid()}`,
          },
          {
            title: 'C466078 Instance 2, Holdings call number UPPER case',
            callNumber: `CASE SENSITIVE CHECK H ${randomLetters.toUpperCase()}`,
            barcode: `466078${uuid()}`,
          },
        ],
      };

      before(() => {
        cy.getAdminToken().then(() => {
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then(
            (location) => {
              testData.locationId = location.id;
            },
          );
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeId = loanTypes[0].id;
          });
          cy.getMaterialTypes({ limit: 1 })
            .then((materialTypes) => {
              testData.materialTypeId = materialTypes.id;
              testData.materialType = materialTypes.name;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[0].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.locationId,
                    callNumber: testData.instances[0].callNumber,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[0].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                  },
                ],
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instances[1].title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.locationId,
                    callNumber: testData.instances[1].callNumber,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[1].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                  },
                ],
              });
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

      after(() => {
        cy.getAdminToken();
        testData.instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.barcode);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C466078 Search by "Call number" field of "Holdings" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466078'] },
        () => {
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.callNumberNotNormalizedOption, '');
          InventorySearchAndFilter.executeSearch(testData.instances[1].callNumber);
          testData.instances.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult.title);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.callNumberNotNormalizedOption, '');
          InventorySearchAndFilter.executeSearch(testData.instances[0].callNumber);
          testData.instances.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult.title);
          });
          testData.instances.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.callNumbeNormalizedOption, '');
            InventorySearchAndFilter.executeSearch(query.callNumber);
            testData.instances.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult.title);
            });
          });
          testData.instances.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query.callNumber);
            testData.instances.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult.title);
            });
          });
        },
      );
    });
  });
});
