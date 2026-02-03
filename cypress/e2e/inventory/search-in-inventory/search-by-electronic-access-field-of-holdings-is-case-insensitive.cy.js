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
        allOption: 'All',
        querySearchOption: 'Query search',
        searchResults: [
          "C466080 Instance 1, Holding's Electronic access lower case test",
          "C466080 Instance 2, Holding's Electronic access lower case test",
        ],
        instances: [
          {
            title: "C466080 Instance 1, Holding's Electronic access lower case test",
            uri: 'www.holdingscase.com/test/uri',
            linkText: 'holdings link text case test',
            materialsSpecification: 'holdings materials case test',
            urlPublicNote: 'holdings public note case test',
            barcode: `466080${randomFourDigitNumber()}`,
          },
          {
            title: "C466080 Instance 2, Holding's Electronic access lower case test",
            uri: 'WWW.HOLDINGSCASE.COM/TEST/URI',
            linkText: 'HOLDINGS LINK TEXT CASE TEST',
            materialsSpecification: 'HOLDINGS MATERIALS CASE TEST',
            urlPublicNote: 'HOLDINGS PUBLIC NOTE CASE TEST',
            barcode: `466080${randomFourDigitNumber()}`,
          },
        ],
        valueProp: ['uri', 'linkText', 'materialsSpecification', 'urlPublicNote'],
        userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      const search = (option, value, isHoldingElectronic = false) => {
        testData.instances.forEach((instance) => {
          InventorySearchAndFilter.selectSearchOptions(option, '');
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventorySearchAndFilter.executeSearch(
            isHoldingElectronic
              ? `holdings.electronicAccess any "${instance[value]}"`
              : instance[value],
          );
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
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
                    electronicAccess: [
                      {
                        uri: instance.uri,
                        linkText: instance.linkText,
                        materialsSpecification: instance.materialsSpecification,
                        publicNote: instance.urlPublicNote,
                      },
                    ],
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
        'C466080 Search by "Electronic access" field of "Holdings" record is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466080'] },
        () => {
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          testData.valueProp.forEach((value) => {
            search(testData.allOption, value);
          });
          testData.valueProp.forEach((value) => {
            search(testData.querySearchOption, value, true);
          });
        },
      );
    });
  });
});
