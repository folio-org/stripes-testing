import { MultiColumnListHeader } from '../../../interactors';
import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Requests', () => {
  const userIds = [];
  const requests = [];
  const instances = [];
  const requestTypes = { PAGE: 'Page', HOLD: 'Hold', RECALL: 'Recall' };
  const instanceTitlePrefix = 'test_sort_';

  before(() => {
    cy.getAdminToken().then(() => {
      Object.values(requestTypes).forEach((requestType) => {
        const itemStatus =
          requestType === REQUEST_TYPES.PAGE
            ? ITEM_STATUS_NAMES.AVAILABLE
            : ITEM_STATUS_NAMES.CHECKED_OUT;
        Requests.createRequestApi(
          itemStatus,
          requestType,
          REQUEST_LEVELS.ITEM,
          instanceTitlePrefix,
        ).then(({ instanceRecordData, createdRequest, createdUser }) => {
          userIds.push(createdUser.id);
          instances.push(instanceRecordData);
          requests.push(createdRequest);
        });
      });

      UserEdit.setupUserDefaultServicePoints(Cypress.env('diku_login'));
    });
    cy.loginAsAdmin();
  });

  after(() => {
    instances.forEach((instance) => {
      cy.deleteItemViaApi(instance.itemId);
      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    requests.forEach((request) => {
      Requests.deleteRequestViaApi(request.id);
    });
    userIds.forEach((id) => {
      Users.deleteViaApi(id);
    });
  });

  // Test is failed. This is a known issue.
  it('C2379 Test Request app sorting (vega)', { tags: ['smoke', 'vega', 'C2379'] }, () => {
    cy.visit(TopMenu.requestsPath);

    cy.intercept('GET', '/circulation/requests?*').as('getRequests');

    Requests.checkAllRequestTypes();
    Requests.validateRequestTypesChecked();
    Requests.findCreatedRequest(instanceTitlePrefix);

    // Validate that the requests are sorted by Request date (oldest at top) by default
    Requests.validateRequestsDateSortingOrder('ascending');

    // Click column header Request Date to verify that they reverse sort
    cy.do(MultiColumnListHeader('Request date').click());
    Requests.waitLoadingRequests();
    Requests.validateRequestsDateSortingOrder('descending');

    Requests.sortingColumns.forEach((column) => {
      if (column.title === 'Requester barcode') {
        cy.get('#list-requests > [class*="mclScrollable"]').scrollTo('right');
      }
      // Validate sort
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({
        headerId: column.id,
        columnIndex: column.columnIndex,
      });

      // Validate reverse sorting
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({
        headerId: column.id,
        columnIndex: column.columnIndex,
      });
    });
  });
});
