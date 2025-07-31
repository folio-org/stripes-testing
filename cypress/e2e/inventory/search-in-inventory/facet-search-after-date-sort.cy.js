import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES, INVENTORY_DEFAULT_SORT_OPTIONS } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      searchQuery: `C553010_autotest_instance_${getRandomPostfix()}`,
      instanceTag: `inst_tag_${randomFourDigitNumber()}`,
      holdingsTag: `hold_tag_${randomFourDigitNumber()}`,
      itemTag: `item_tag_${randomFourDigitNumber()}`,
      instanceLanguage: 'eng',
      instanceAccordions: [
        'Effective location (item)',
        'Language',
        'Resource type',
        'Nature of content',
        'Statistical code',
        'Tags',
      ],
      holdingsAccordions: [
        'Effective location (item)',
        'Holdings permanent location',
        'Holdings type',
        'Statistical code',
        'Tags',
      ],
      itemAccordions: [
        'Item status',
        'Effective location (item)',
        'Holdings permanent location',
        'Material type',
        'Statistical code',
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
          });
          cy.getDefaultMaterialType().then((res) => {
            instances[0].materialTypeId = res.id;
          });
          cy.getInstanceDateTypesViaAPI().then(({ instanceDateTypes }) => {
            instances[0].instanceDateTypeId = instanceDateTypes[0].id;
          });
          NatureOfContent.getViaApi({ limit: 1 }).then(({ natureOfContentTerms }) => {
            instances[0].natureOfContentId = natureOfContentTerms[0].id;
          });
          StatisticalCodes.createViaApi().then((statCode) => {
            instances[0].statisticalCodeId = statCode.id;
          });
        })
        .then(() => {
          instances.forEach((instance, index) => {
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
                dates: {
                  dateTypeId: instances[0].instanceDateTypeId,
                  date1: `111${index}`,
                  date2: '2222',
                },
                natureOfContentTermIds: [instances[0].natureOfContentId],
                statisticalCodeIds: [instances[0].statisticalCodeId],
              },
              holdings: [
                {
                  holdingsTypeId: instances[0].holdingTypeId,
                  permanentLocationId: instances[0].locationId,
                  tags: {
                    tagList: [testData.holdingsTag],
                  },
                  statisticalCodeIds: [instances[0].statisticalCodeId],
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
                statisticalCodeIds: [instances[0].statisticalCodeId],
              });
            });
          });
        });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
      StatisticalCodes.deleteViaApi(instances[0].statisticalCodeId);
    });

    it(
      'C553010 Verify that facets options are available after "Date" sort was applied to the result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C553010'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickActionsButton();
        InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkResultListSortedByColumn(4);
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
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickActionsButton();
        InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkResultListSortedByColumn(4);
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
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.clickActionsButton();
        InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.checkResultListSortedByColumn(4);
        testData.itemAccordions.forEach((accordion) => {
          InventorySearchAndFilter.expandAccordion(accordion);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(accordion);
        });
      },
    );
  });
});
