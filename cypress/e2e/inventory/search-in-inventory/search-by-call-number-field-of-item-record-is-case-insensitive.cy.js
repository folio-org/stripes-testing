import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        searchOptions: [
          'Effective call number (item), not normalized',
          'Effective call number (item), normalized',
          'All',
        ],
        instances: [
          {
            title: 'C466082 Instance 1, Item call number lower case',
            callNumber: 'case sensitive check i',
            barcode: `466082${randomFourDigitNumber()}`,
          },
          {
            title: 'C466082 Instance 2, Item call number UPPER case',
            callNumber: 'CASE SENSITIVE CHECK I',
            barcode: `466082${randomFourDigitNumber()}`,
          },
        ],
        searchValues: ['CSC001*', 'csc001*'],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      before('Create user, test data', () => {
        cy.getAdminToken();
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
        cy.getDefaultMaterialType()
          .then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
            testData.materialType = materialTypes.name;
          })
          .then(() => {
            testData.instances.forEach((instance) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: instance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                  },
                ],
                items: [
                  {
                    barcode: instance.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                    itemLevelCallNumber: instance.callNumber,
                  },
                ],
              });
            });
          });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user, test data', () => {
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
        'C466082 Search by "Call number" field of "Item" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466082'] },
        () => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();

          testData.searchOptions.forEach((option) => {
            testData.instances.forEach((instance) => {
              InventorySearchAndFilter.selectSearchOptions(option, '');
              InventorySearchAndFilter.executeSearch(instance.callNumber);
              testData.instances.forEach((expectedResult) => {
                InventorySearchAndFilter.verifySearchResult(expectedResult.title);
              });
              InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            });
          });
        },
      );
    });
  });
});
