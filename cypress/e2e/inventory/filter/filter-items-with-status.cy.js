import uuid from 'uuid';
import { MultiColumnList } from '../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
const holdingId = uuid();
const title = `Filter items with status test ${Number(new Date())}`;
let source;

describe('ui-inventory: Search in Inventory', () => {
  before('create inventory instance', () => {
    cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 2 });
          cy.getHoldingTypes({ limit: 1 });
          source = InventoryHoldings.getHoldingSources({ limit: 1 });
          cy.getInstanceTypes({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
          cy.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
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
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
                holdingId,
              },
            ],
            items: [items],
          });
        });
    });
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` }).then(
      (instance) => {
        instance.items.forEach((item) => {
          cy.deleteItemViaApi(item.id);
        });
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
    users.deleteViaApi(userId);
  });

  it(
    'C11081: Verify item status filters retrieve items with that item status (spitfire)',
    { tags: ['smoke', 'spitfire'] },
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
        FilterItems.toggleAccordionItemsButton(holdingId);
        cy.wait('@getItems');
        FilterItems.verifyItemWithStatusExists(holdingId, status);

        InventorySearchAndFilter.resetAll();
        cy.expect(MultiColumnList().absent());
      });
    },
  );
});
