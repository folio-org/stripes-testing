import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      searchQuery: `C422216_autotest_instance_${getRandomPostfix()}`,
      instanceTag: `inst_tag_${randomFourDigitNumber()}`,
      holdingsTag: `hold_tag_${randomFourDigitNumber()}`,
      itemTag: `item_tag_${randomFourDigitNumber()}`,
      instanceLanguage: 'eng',
      titleHeader: 'Title',
      relevanceSortOption: 'Relevance',
      instanceAccordions: [
        'Language',
        'Resource Type',
        'Staff suppress',
        'Suppress from discovery',
        'Source',
        'Tags',
      ],
    };
    const instances = [
      {
        title: `${testData.searchQuery}__1`,
      },
      {
        title: `${testData.searchQuery}__2`,
      },
      {
        title: `${testData.searchQuery}__3`,
      },
      {
        title: `${testData.searchQuery}__4`,
      },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 2 }).then((instanceTypes) => {
            instances[0].instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            instances[0].holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            instances[0].locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            instances[0].loanTypeId = res[0].id;
            instances[0].loanTypeName = res[0].name;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            instances[0].materialTypeId = res.id;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          instances[0].defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(instances[0].defaultLocation);
        })
        .then(() => {
          instances.forEach((instance) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instances[0].instanceTypeId,
                title: instance.title,
                staffSuppress: false,
                isBoundWith: false,
                languages: [testData.instanceLanguage],
                tags: {
                  tagList: [testData.instanceTag],
                },
              },
              holdings: [
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].defaultLocation.id,
                  tags: {
                    tagList: [testData.holdingsTag],
                  },
                },
              ],
            }).then((instanceIds) => {
              instance.id = instanceIds.instanceId;
              ItemRecordNew.createViaApi({
                holdingsId: instanceIds.holdingIds[0].id,
                itemBarcode: uuid(),
                materialTypeId: instances[0].materialTypeId,
                permanentLoanTypeId: instances[0].loanTypeId,
                tags: {
                  tagList: [testData.itemTag],
                },
              });
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
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
    });

    it(
      'C422216 Verify that facets options are available after "Relevance" sort was applied to the result list (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstance.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.switchToInstance();
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickActionsButton();
        InventoryInstances.actionsSortBy(testData.relevanceSortOption);
        InventoryInstances.clickActionsButton();
        InventoryInstances.verifyActionsSortedBy(testData.relevanceSortOption);
        testData.instanceAccordions.forEach((accordion) => {
          InventorySearchAndFilter.expandAccordion(accordion);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(accordion);
        });

        // cy.wait(5000);
        // InventorySearchAndFilter.switchToBrowseTab();
        // InventorySearchAndFilter.verifyBrowseOptions();

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL);
        // InventorySearchAndFilter.browseSearch(callNumbers[0].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0].value);

        // InventorySearchAndFilter.selectBrowseOption(
        //   BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        // );
        // InventorySearchAndFilter.browseSearch(callNumbers[1].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1].value);

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE);
        // InventorySearchAndFilter.browseSearch(callNumbers[2].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].value);

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS);
        // InventorySearchAndFilter.browseSearch(callNumbers[3].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[3].value);

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LOCAL);
        // InventorySearchAndFilter.browseSearch(callNumbers[5].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].value);

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME);
        // InventorySearchAndFilter.browseSearch(callNumbers[4].value);
        // BrowseCallNumber.checkNonExactSearchResult(callNumbers[4].value);

        // InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        // InventorySearchAndFilter.browseSearch(callNumbers[0].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[0].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[1].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[2].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[3].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[3].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[5].value);
        // BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[5].value);

        // InventorySearchAndFilter.browseSearch(callNumbers[4].value);
        // BrowseCallNumber.checkNonExactSearchResult(callNumbers[4].value);
      },
    );
  });
});
