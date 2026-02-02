import uuid from 'uuid';
import { MultiColumnList } from '../../../../interactors';
import { ITEM_STATUS_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
const holdingId = uuid();
const title = `AT_C11081_FolioInstance_${Number(new Date())}`;
const testData = {
  itemStatusAccordionName: 'Item status',
  itemStatusNotFullValue: 'out',
  itemStatusFullValue: 'Checked out',
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('create inventory instance', () => {
      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.getAdminToken()
          .then(() => {
            cy.getBookMaterialType().then((res) => {
              testData.materialType = res.id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              testData.location = res.id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              testData.holdingType = res[0].id;
            });
            InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => {
              testData.holdingSource = res[0].id;
            });
            cy.getInstanceTypes({ limit: 1 }).then((res) => {
              testData.instanceType = res[0].id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanType = res[0].id;
            });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `("username"="${userProperties.username}") and ("active"="true")`,
            });
          })
          .then(() => {
            const items = FilterItems.itemStatuses.map((status) => ({
              barcode:
                status === ITEM_STATUS_NAMES.AVAILABLE ? ITEM_BARCODE : `test${getRandomPostfix()}`,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: status },
              permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
              materialType: { id: Cypress.env('materialTypes')[0].id },
            }));
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingType,
                  permanentLocationId: testData.location,
                  sourceId: testData.holdingSource,
                  holdingId,
                },
              ],
              items: [items],
            });
          });
      });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
    });

    after('Delete all data', () => {
      cy.getAdminToken();
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${ITEM_BARCODE}"`,
      }).then((instance) => {
        instance.items.forEach((item) => {
          cy.deleteItemViaApi(item.id);
        });
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      users.deleteViaApi(userId);
    });

    it(
      'C11081 Verify item status filters retrieve items with that item status (spitfire)',
      { tags: ['smoke', 'spitfire', 'C11081'] },
      () => {
        cy.intercept('GET', '/inventory/items?*').as('getItems');
        cy.intercept('GET', '/search/instances?*').as('getInstances');
        cy.intercept('GET', '/orders/titles?*').as('getTitles');
        cy.intercept('GET', '/search/instances/facets?*').as('getFacets');
        cy.intercept('GET', '/holdings-storage/holdings?*').as('getHoldings');

        InventorySearchAndFilter.switchToItem();
        FilterItems.toggleItemStatusAccordion();

        cy.wrap(FilterItems.itemStatuses).each((status) => {
          FilterItems.toggleStatus(status);
          cy.wait(['@getInstances', '@getFacets']);
          cy.expect(MultiColumnList().exists());

          InventorySearchAndFilter.searchByParameter(
            'Keyword (title, contributor, identifier, HRID, UUID)',
            title,
          );
          FilterItems.selectInstance(title);
          FilterItems.waitItemsLoading();

          // Waiter required for the pane to be loaded.
          cy.wait(1000);
          FilterItems.toggleAccordionItemsButton(holdingId);
          cy.wait('@getItems');
          FilterItems.verifyItemWithStatusExists(holdingId, status);

          InventorySearchAndFilter.resetAll();
          cy.expect(MultiColumnList().absent());
        });
        InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
          testData.itemStatusAccordionName,
          testData.itemStatusNotFullValue,
          testData.itemStatusFullValue,
        );
      },
    );
  });
});
