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
        {
          title: `C400619_autotest_instance ${getRandomPostfix()}`,
          callNumber: 'CNY118HO118001',
          holdingsNote: `Adv search note 005 ${getRandomPostfix()}`,
        },
        {
          title: `C400619_autotest_instance ${getRandomPostfix()}`,
          callNumber: 'CNY118HO118002',
        },
      ],
    };

    before('Create test data', () => {
      /*
  1) System should have at least one "Instance" record (source - FOLIO or MARC)
  2) Add "Holdings" to any existing "Instance" record
  * Specify "Call number" for added "Holdings" (e.g. "CNY118HO118001")
  * Add an "Item" to added "Holdings"
  * Add a note to "Holdings" record (In editing view: click "Add notes" button → Select any note type → Fill note value, e.g. "Adv search note 005")
  * Note "UUID" of added "Holdings" (Open detail view of "Holdings", note second UUID value in browser address bar, for example /inventory/view/69640328-788e-43fc-9c3c-af39e243f3b7/n**0c45bb50-7c9b-48b0-86eb-178a494e25fe** )
  * Note title of "Instance" record
  3) Add "Holdings" to another existing "Instance" record
  * Specify "Call number" for added "Holdings" (e.g. "CNY118HO118002")
  * Add an "Item" to added "Holdings"
  * Note "HRID" of added "Holdings"
  * Note title of "Instance" record
  */
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('C400619');
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
            testData.loanTypeName = res[0].name;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          InventoryInstances.getHoldingsNotesTypes({ limit: 1 }).then((res) => {
            testData.holdingsNotesType = res[0].id;
          });
          [...Array(2)].forEach((_, index) => {
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            const defaultLocation = Location.getDefaultLocation(servicePoint.id);
            Location.createViaApi(defaultLocation);
            testData.instances[index].defaultLocation = defaultLocation;
          });
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
                  permanentLocationId: instance.defaultLocation.id,
                  callNumber: instance.callNumber,
                  notes: instance.holdingsNote
                    ? [
                      {
                        note: instance.holdingsNote,
                        staffOnly: false,
                        holdingsNoteTypeId: testData.holdingsNotesType,
                      },
                    ]
                    : [],
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
              testData.instances[index].holdingsId = instanceIds.holdingIds[0].id;
              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${instanceIds.instanceId}"`,
              }).then((holdings) => {
                testData.instances[index].holdingsHRID = holdings[0].hrid;
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
      'C400619 Search Holdings using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C400619', 'eurekaPhase1'] },
      () => {
        // #1 Select "Holdings" toggle on "Search & filter" pane
        InventorySearchAndFilter.switchToHoldings();
        // #2 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // #3 In first line in modal:
        // * Fill search input field with part of a note value from Preconditions (e.g., "search note 005")
        // * Select an option in search modifier dropdown (e.g., "Contains all")
        // * Select an option in search option dropdown (e.g., "Holdings notes (all)")
        // Inputted values are shown in first line in modal
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.instances[0].holdingsNote.slice(4),
          'Contains all',
          'Holdings notes (all)',
        );

        // #4 In second line in modal:
        // * Select " *OR* " option in operator select dropdown
        // * Fill search input field with "HRID" value noted in Preconditions
        // * Select an option in search modifier dropdown (e.g., "Exact phrase")
        // * Select an option in search option dropdown (e.g., "Holdings HRID")
        // Inputted values are shown in second line in modal
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.instances[1].holdingsHRID,
          'Exact phrase',
          'Holdings HRID',
          'OR',
        );
        // #5 Click on "Search" button in modal
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        // * Modal is closed
        InventoryInstances.checkAdvSearchModalAbsence();
        //  * "Advanced search" search option selected
        InventoryInstances.verifySelectedSearchOption('Advanced search');
        // * In second pane, search results are shown with records corresponding to values inputted at Steps 3, 4
        InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        // #6 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // * Values inputted at Steps 3, 4 are shown in corresponding fields
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.instances[0].holdingsNote.slice(4),
          'Contains all',
          'Holdings notes (all)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          testData.instances[1].holdingsHRID,
          'Exact phrase',
          'Holdings HRID',
          'OR',
        );
        // #7 Click "X" icon in upper left corner of the modal
        InventoryInstances.clickCloseBtnInAdvSearchModal();
        // Click "Reset all" button
        InventoryInstances.resetAllFilters();

        // #8 Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        // * All fields have empty/default values
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          'Contains all',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        // #9 In first line in modal:
        // * Fill search input field with part of a "Call number" value from Preconditions (e.g., "CNY118HO11800")
        // * Select an option in search modifier dropdown (e.g., "Starts with")
        // * Select an option in search option dropdown (e.g., "Call number, normalized")
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.instances[0].callNumber.slice(0, -1),
          'Starts with',
          'Call number, normalized',
        );
        // #10 In second line in modal:
        // * Select " *NOT* " option in operator select dropdown
        // * Fill search input field with "UUID" noted at Precondition 2
        // * Select an option in search modifier dropdown (e.g., "Exact phrase")
        // * Select an option in search option dropdown (e.g., "Holdings UUID")
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.instances[0].holdingsId,
          'Exact phrase',
          'Holdings UUID',
          'NOT',
        );
        // #11 Click on "Search" button in modal
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        // * Modal is closed
        InventoryInstances.checkAdvSearchModalAbsence();

        //  * "Advanced search" search option selected
        InventoryInstances.verifySelectedSearchOption('Advanced search');
        //  * An "Instance" from Precondition 3 (title matches the noted title)
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
