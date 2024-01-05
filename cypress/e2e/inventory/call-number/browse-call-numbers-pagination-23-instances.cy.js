import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
// import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
// import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      randomPostfix: randomFourDigitNumber(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      folioInstances: [],
      extraHoldings: [],
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        // data for instances with call numbers for test
        for (let i = 0; i < 23; i++) {
          testData.folioInstances.push(
            InventoryInstances.generateFolioInstances({
              holdings: [{ callNumber: `test ${testData.randomPostfix} ${i + 301}` }],
            })[0],
          );
        }
        // data for instances with preceeding call numbers
        // so that there would always be previous result page available
        for (let i = 0; i < 6; i++) {
          testData.folioInstances.push(
            InventoryInstances.generateFolioInstances({
              holdings: [{ callNumber: `acallnumber ${i}` }],
            })[0],
          );
        }

        ServicePoints.createViaApi(testData.servicePoint);

        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.log(testData.folioInstances[0].instanceId);

      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      testData.folioInstances.forEach(({ instanceId }) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
    });

    it(
      'C423492 Use pagination button browsing for call number which do not have the first 10 characters of the shelving order and 23 instances with call numbers "test + unique number" (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(`test ${testData.randomPostfix}`);
        cy.wait(5000);

        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].dewey);
        // BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('dewey', 5));

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS);
        // InventorySearchAndFilter.browseSearch(callNumbers[6].lc);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[6].lc);
        // BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('lc', 6));

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LOCAL);
        // InventorySearchAndFilter.browseSearch(callNumbers[6].local);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[6].local);
        // BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('local', 6));

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE);
        // InventorySearchAndFilter.browseSearch(callNumbers[2].nlm);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].nlm);
        // BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('nlm', 2));

        // InventorySearchAndFilter.selectBrowseOption(
        //   BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        // );
        // InventorySearchAndFilter.browseSearch(callNumbers[4].sudoc);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[4].sudoc);
        // BrowseCallNumber.verifyCallNumbersNotFound(filterCNsExcluding('sudoc', 4));
      },
    );
  });
});
