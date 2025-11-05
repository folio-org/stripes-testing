import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    let callNumberIncrement = 30;
    let barcodeId = 111;
    const numberOfInventory = 25;
    const callNumbers = [];
    const barcodes = [];
    [...Array(numberOfInventory)].forEach(() => barcodes.push(`399095${++barcodeId}-${Date.now()}`));
    [...Array(numberOfInventory)].forEach(() => callNumbers.push(`E 3184 S75 12${++callNumberIncrement}`));
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Create test data', () => {
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
        cy.getDefaultMaterialType()
          .then((materialTypes) => {
            testData.materialTypeId = materialTypes.id;
            testData.materialType = materialTypes.name;
          })
          .then(() => {
            barcodes.forEach((barcode, i) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: `instance_${randomFourDigitNumber()}`,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.defaultLocation.id,
                    callNumber: callNumbers[i],
                  },
                ],
                items: [
                  {
                    barcode: barcodes[i],
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                  },
                ],
              });
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

    after('Delete test data', () => {
      cy.getAdminToken();
      barcodes.forEach((barcode) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
      });
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
      cy.deleteLoanType(testData.loanTypeId);
    });

    it(
      'C399095 Verify that "Browse call numbers" result list correctly displays preceding results before the one being searched (all "Items" in different "Instances") (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C399095', 'eurekaPhase1'] },
      () => {
        // Fill in the input field at "Search & filter" pane with the "Call number" value which is alphabetically the first one out of all 25 (see Preconditions)
        // (For example, "E 3184 S75 1231")
        InventorySearchAndFilter.selectBrowseCallNumbers();
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        });
        InventorySearchAndFilter.browseSearch(callNumbers[0]);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0]);
        BrowseCallNumber.resultRowsIsInRequiredOder(callNumbers);

        // Fill in the input field at "Search & filter" pane with the "Call number" value which is alphabetically not the first one out of all 25 (see Preconditions)
        // (For example, "E 3184 S75 1238")
        InventorySearchAndFilter.browseSearch(callNumbers[7]);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[7]);
        BrowseCallNumber.resultRowsIsInRequiredOder(callNumbers.slice(8));
      },
    );
  });
});
