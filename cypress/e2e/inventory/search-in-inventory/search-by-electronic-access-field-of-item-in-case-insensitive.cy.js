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
        querySearchOption: 'Query search',
        allOption: 'All',
        searchResults: [
          "C466084 Instance 1, Item's Electronic access lower case test",
          "C466084 Instance 2, Item's Electronic access UPPER case test",
        ],
        instances: [
          {
            title: "C466084 Instance 1, Item's Electronic access lower case test",
            callNumber: 'case insensitive check',
            barcode: `C466084${randomFourDigitNumber()}`,
            linkText: 'item link text case test',
            materialsSpecification: 'item materials case test',
            publicNote: 'item public note case test',
            uri: 'www.itemcase.com/test/uri',
          },
          {
            title: "C466084 Instance 2, Item's Electronic access UPPER case test",
            callNumber: 'CASE INSENSITIVE CHECK',
            barcode: `C466084${randomFourDigitNumber()}`,
            linkText: 'ITEM LINK TEXT CASE TEST',
            materialsSpecification: 'ITEM MATERIALS CASE TEST',
            publicNote: 'ITEM PUBLIC NOTE CASE TEST',
            uri: 'WWW.ITEMCASE.COM/TEST/URI',
          },
        ],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      function executeSearchAndVerifyResults(
        searchValue,
        searchOption,
        useElectronicAccessFormat = false,
      ) {
        testData.instances.forEach((instance) => {
          const searchString = useElectronicAccessFormat
            ? `item.electronicAccess any "${instance[searchValue]}"`
            : instance[searchValue];

          InventorySearchAndFilter.executeSearch(searchString);
          cy.wait(1000);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          cy.wait(100);
          InventorySearchAndFilter.selectSearchOption(searchOption);
        });
      }

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
                    electronicAccess: [
                      {
                        linkText: instance.linkText,
                        materialsSpecification: instance.materialsSpecification,
                        publicNote: instance.publicNote,
                        uri: instance.uri,
                      },
                    ],
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
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.selectSearchOption(testData.allOption);
          cy.wait(1000);
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
        'C466084 Search by "Electronic access" field of "Item" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466084'] },
        () => {
          executeSearchAndVerifyResults('uri', testData.allOption);
          executeSearchAndVerifyResults('linkText', testData.allOption);
          executeSearchAndVerifyResults('materialsSpecification', testData.allOption);
          executeSearchAndVerifyResults('publicNote', testData.allOption);

          InventorySearchAndFilter.selectSearchOption(testData.querySearchOption);

          executeSearchAndVerifyResults('uri', testData.querySearchOption, true);
          executeSearchAndVerifyResults('linkText', testData.querySearchOption, true);
          executeSearchAndVerifyResults('materialsSpecification', testData.querySearchOption, true);
          executeSearchAndVerifyResults('publicNote', testData.querySearchOption, true);
        },
      );
    });
  });
});
