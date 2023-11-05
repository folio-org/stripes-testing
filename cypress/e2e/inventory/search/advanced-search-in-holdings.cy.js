import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory -> Advanced search', () => {
  const testData = {
    instances: [
      { title: `C387477_autotest_instance ${getRandomPostfix()}` },
      { title: `C387477_autotest_instance ${getRandomPostfix()}` },
    ],
    callNumber: 'YCN1102203546825',
    defaultLocations: [],
  };

  before('Create test data', () => {
    /*
      1) System should have at least one "Instance" record (source - FOLIO or MARC)
      2) Add "Holdings" to any existing "Instance" record
      * Specify "Call number" value in added "Holdings" (e.g., YCN1102203546825)
      * Add an "Item" to added "Holdings"
      3) Add "Holdings" to another existing "Instance" record
      * Specify the same "Call number" value in added "Holdings" (e.g., YCN1102203546825)
      * Add an "Item" to added "Holdings"
      * Note "HRID" of added "Holdings"
      * Note title of "Instance" record
    */
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 2 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
          testData.loanTypeName = res[0].name;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
          testData.callNumberTypes = res;
        });
        const servicePoint1 = ServicePoints.getDefaultServicePointWithPickUpLocation();
        const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();
        testData.defaultLocations[0] = Location.getDefaultLocation(servicePoint1.id);
        testData.defaultLocations[1] = Location.getDefaultLocation(servicePoint2.id);
        Location.createViaApi(testData.defaultLocations[0]);
        Location.createViaApi(testData.defaultLocations[1]);
      })
      .then(() => {
        testData.instances.forEach((instance, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocations[index].id,
                callNumber: testData.callNumber,
              },
            ],
            items: [
              {
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instances[index].id = instanceIds.instanceId;
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
    'C400617 Search Holdings using advanced search with "AND" operator (spitfire) (null)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      // #1 Select "Holdings" toggle on "Search & filter" pane
      InventorySearchAndFilter.switchToHoldings();
      // "Advanced search" button is shown to the right of the "Reset all" button and is enabled

      // #2 Click on "Advanced search" button
      InventoryInstances.clickAdvSearchButton();
      // #3 Click on operator select dropdown (first row) in any line in modal
      // Dropdown expanded and contains following options:* AND, * OR, * NOT
      // #4 Click on search modifier select dropdown (third row) in any line in modal
      // Dropdown expanded and contains following options:* Exact phrase, * Contains all, * Starts with, * Contains any
      // #5 Click on search option select dropdown (fourth row) in any line in modal
      // Dropdown expanded and contains following options:
      // * Keyword (title, contributor, identifier, HRID, UUID)
      // * ISBN
      // * ISSN
      // * Call number, eye readable
      // * Call number, normalized
      // * Holdings notes (all)
      // * Holdings administrative notes
      // * Holdings HRID
      // * Holdings UUID
      // * All
      InventoryInstances.checkAdvSearchInstancesModalFields(0, 'Holdings');
      // #6 Click on "X" icon in the upper left corner of the modal
      // "Advanced search" modal window is closed
      InventoryInstances.clickCloseBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      // #7 Click on "Advanced search" button
      // "Advanced search" modal window appears
      InventoryInstances.clickAdvSearchButton();
      // #8 In first line in modal:
      // * Fill search input field with "Call number" value specified in Preconditions (e.g., "YCN1102203546825")
      // * Select an option in search modifier dropdown (e.g., "Exact phrase")
      // * Select an option in search option dropdown (e.g., "Call number, normalized")
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
      // #9 In second line in modal:
      // * Select " *AND* " option in operator select dropdown
      // * Fill search input field with "HRID" value noted in Preconditions, and delete the first character from it
      // * Select an option in search modifier dropdown (e.g., "Contains any")
      // * Select an option in search option dropdown (e.g., "Holdings HRID")
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
      // * Modal is closed
      // * In "Search & filter" pane:
      //  * "Advanced search" search option selected
      // * In second pane, search results are shown with records corresponding to values inputted at Steps 8, 9, e.g.:
      //  * An "Instance" from Precondition 3 (title matches the noted title)
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption('Advanced search');
      InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
      InventorySearchAndFilter.checkRowsCount(1);
      // #11 Click on "Advanced search" button
      InventoryInstances.clickAdvSearchButton();
      // #12 Press "ESC" keyboard key
      InventoryInstances.closeAdvSearchModalUsingESC();
      InventoryInstances.checkAdvSearchModalAbsence();
    },
  );
});
