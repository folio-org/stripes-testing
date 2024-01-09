import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      searchQuery: `C422219_autotest_instance_${getRandomPostfix()}`,
      instanceTag: `inst_tag_${randomFourDigitNumber()}`,
      holdingsTag: `hold_tag_${randomFourDigitNumber()}`,
      itemTag: `item_tag_${randomFourDigitNumber()}`,
      instanceLanguage: 'eng',
      titleHeader: 'Title',
      instanceAccordions: [
        'Language',
        'Resource Type',
        'Staff suppress',
        'Suppress from discovery',
        'Source',
        'Tags',
      ],
      holdingsAccordions: ['Holdings type', 'Suppress from discovery', 'Source', 'Tags'],
      itemAccordions: ['Item status', 'Suppress from discovery', 'Material type', 'Tags'],
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
      // without logout, queries from previous run may persist in search during manual re-run
      cy.logout();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
    });

    it(
      'C422219 Verify that facets options are available after "Title" sort was applied to the result list (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventorySearchAndFilter.switchToInstance();
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickColumnHeader(testData.titleHeader);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader, false);
        InventoryInstances.checkResultListSortedByColumn(1, false);
        testData.instanceAccordions.forEach((accordion) => {
          InventorySearchAndFilter.expandAccordion(accordion);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(accordion);
        });

        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        testData.holdingsAccordions.forEach((accordion) => {
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordion, false);
        });
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickColumnHeader(testData.titleHeader);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader, false);
        InventoryInstances.checkResultListSortedByColumn(1, false);
        testData.holdingsAccordions.forEach((accordion) => {
          InventorySearchAndFilter.expandAccordion(accordion);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(accordion);
        });

        InventorySearchAndFilter.switchToItem();
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        testData.itemAccordions.forEach((accordion) => {
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordion, false);
        });
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickColumnHeader(testData.titleHeader);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader, false);
        InventoryInstances.checkResultListSortedByColumn(1, false);
        testData.itemAccordions.forEach((accordion) => {
          InventorySearchAndFilter.expandAccordion(accordion);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(accordion);
        });
      },
    );
  });
});
