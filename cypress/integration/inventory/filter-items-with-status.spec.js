import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';

import TopMenu from '../../support/fragments/topMenu';
import InventoryItems from '../../support/fragments/inventory/inventoryItem/inventoryItems';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import TestTypes from '../../support/dictionary/testTypes';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
const holdingId = uuid();
const title = `Filter items with status test ${Number(new Date())}`;
let source;

describe('ui-inventory: items with status', () => {
  const itemStatuses = [
    'Available',
    'Checked out',
    'On order',
    'In process',
    'Awaiting pickup',
    'Awaiting delivery',
    'In transit',
    'Missing',
    'Withdrawn',
    'Claimed returned',
    'Declared lost',
    'Lost and paid',
    'Paged',
    'Order closed'
  ];

  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
    ])
      .then(userProperties => {
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
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            const items = itemStatuses.map(status => ({
              barcode: status === 'Available' ? ITEM_BARCODE : `test${getRandomPostfix()}`,
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
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
                holdingId,
              }],
              items: [items],
            });
          });
      });
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        instance.items.forEach((item) => {
          cy.deleteItem(item.id);
        });
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(userId);
  });

  itemStatuses.forEach((status) => {
    it(`C11081: Verify item status filters retrieve items with that item status - ${status} (folijet) (prokopovych)`, { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      InventorySearch.switchToItem();
      InventoryItems.toggleItemStatusAccordion();
      InventoryItems.toggleStatus(status);
      InventoryItems.checkIsInstanceListPresented();

      InventoryItems.searchByParameter('Keyword (title, contributor, identifier)', title);
      InventoryItems.selectInstance(title);

      InventoryItems.toggleAccordionItemsButton(holdingId);
      InventoryItems.verifyItemWithStatusExists(holdingId, status);

      InventoryItems.resetAllFilters();
      InventoryItems.checkIsInstanceListAbsent();
    });
  });
});
