import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        effectiveCallNumberOption: 'Effective call number (item), shelving order',
        allOption: 'All',
        instances: [
          {
            title: 'C466076 Instance 1, Instance shelving order lower case',
            callNumber: 'case sensitive check',
            barcode: `466076${randomFourDigitNumber()}`,
          },
          {
            title: 'C466076 Instance 2, Instance shelving order UPPER case',
            callNumber: 'CASE SENSITIVE CHECK',
            barcode: `466076${randomFourDigitNumber()}`,
          },
        ],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      before(() => {
        cy.getAdminToken().then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
          Location.createViaApi(testData.defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.createLoanType({
            name: getTestEntityValue('type'),
          }).then((loanType) => {
            testData.loanTypeId = loanType.id;
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
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[0].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    itemLevelCallNumber: testData.instances[0].callNumber,
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
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: testData.instances[1].barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    itemLevelCallNumber: testData.instances[1].callNumber,
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
        ServicePoints.deleteViaApi(testData.userServicePoint.id);
        Locations.deleteViaApi(testData.defaultLocation);
        Users.deleteViaApi(testData.user.userId);
        cy.deleteLoanType(testData.loanTypeId);
      });

      it(
        'C466076 Search by "Shelving order" field is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466076'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.effectiveCallNumberOption, '');
          InventorySearchAndFilter.executeSearch(testData.instances[1].callNumber);
          testData.instances.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult.title);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.effectiveCallNumberOption, '');
          InventorySearchAndFilter.executeSearch(testData.instances[0].callNumber);
          testData.instances.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult.title);
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
