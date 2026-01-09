import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        keywordOption: searchItemsOptions[0],
        barcodeOption: searchItemsOptions[1],
        allOption: searchItemsOptions[11],
        instances: [
          {
            title: "C466081 Instance 1, Item's barcode lower case",
            barcode: 'CSC001',
          },
          {
            title: "C466081 Instance 2, Item's barcode number UPPER case",
            barcode: 'csc0011',
          },
        ],
        searchValues: ['CSC001*', 'csc001*'],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      const search = (option, value) => {
        InventorySearchAndFilter.selectSearchOptions(option, '');
        InventorySearchAndFilter.executeSearch(value);
        testData.instances.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult.title);
        });
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
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
            authRefresh: true,
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
        if (testData.user && testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }
        cy.deleteLoanType(testData.loanTypeId);
      });

      it(
        'C729565 Search by "Barcode" field of "Item" record is case-insensitive (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C729565'] },
        () => {
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();

          testData.searchValues.forEach((value) => {
            search(testData.barcodeOption, value);
          });
          testData.searchValues.forEach((value) => {
            search(testData.allOption, value);
          });
        },
      );
    });
  });
});
