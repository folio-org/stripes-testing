import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      instances: [
        { title: `C400617_autotest_instance ${getRandomPostfix()}` },
        { title: `C400617_autotest_instance ${getRandomPostfix()}` },
      ],
      callNumber: 'YCN1102203546825',
      defaultLocations: [],
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          [...Array(2)].forEach((_, index) => {
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            testData.defaultLocations[index] = Location.getDefaultLocation(servicePoint.id);
            Location.createViaApi(testData.defaultLocations[index]);
          });
        })
        .then(() => {
          // 1) System should have "Instance" records
          testData.instances.forEach((instance, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instance.title,
              },
              // 2 - 3) Add "Holdings" to "Instance" record, specify "Call number",
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocations[index].id,
                  callNumber: testData.callNumber,
                },
              ],
              // * Add an "Item" to added "Holdings"
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((instanceIds) => {
              testData.instances[index].id = instanceIds.instanceId;
              // * Note "HRID" of added "Holdings"
              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${instanceIds.instanceId}"`,
              }).then((holdings) => {
                testData.instances[index].holdingHRID = holdings[0].hrid;
              });
            });
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C736740 Search Holdings using advanced search with "AND" operator (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C736740', 'eurekaPhase1'] },
      () => {
        // #1 Select "Holdings" toggle on "Search & filter" pane
        InventorySearchAndFilter.switchToHoldings();
        // #2 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // #3 - #5 Check advanced search dropdowns, including operator, search modifier and search option
        InventoryInstances.checkAdvSearchInstancesModalFields(0, 'Holdings');
        // #6 Click on "X" icon in the upper left corner of the modal
        InventoryInstances.clickCloseBtnInAdvSearchModal();
        // "Advanced search" modal window is closed
        InventoryInstances.checkAdvSearchModalAbsence();
        // #7 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // #8 Fill in the first line in modal: search input: "Call number" value; search modifier: "Exact phrase";
        // search option: "Call number, normalized"
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.callNumber,
          'Exact phrase',
          'Call number, normalized',
        );
        // Inputted values are shown in first line in modal
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.callNumber,
          'Exact phrase',
          'Call number, normalized',
        );
        // #9 Fill in the second line in modal: operator: "AND"; search input: "HRID" with deleted the first character;
        // search modifier: "Contains any"; search option: "Holdings HRID"
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.instances[1].holdingHRID.slice(1),
          'Contains any',
          'Holdings HRID',
          'AND',
        );
        // Inputted values are shown in second line in modal
        InventoryInstances.checkAdvSearchModalValues(
          1,
          testData.instances[1].holdingHRID.slice(1),
          'Contains any',
          'Holdings HRID',
          'AND',
        );
        // #10 Click on "Search" button in modal
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        // * Modal is closed
        InventoryInstances.checkAdvSearchModalAbsence();
        //  * "Advanced search" search option selected
        InventoryInstances.verifySelectedSearchOption('Advanced search');
        //  * An "Instance" from Precondition 3 (title matches the noted title)
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        InventorySearchAndFilter.checkRowsCount(1);

        // #11 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // #12 Press "ESC" keyboard key
        InventoryInstances.closeAdvSearchModalUsingESC();
        // "Advanced search" modal window is closed
        InventoryInstances.checkAdvSearchModalAbsence();
      },
    );
  });
});
