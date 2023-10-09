import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import { MultiColumnListHeader } from '../../../interactors';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';
import TestTypes from '../../support/dictionary/testTypes';

describe('ui-requests: Sort requests', () => {
  const userIds = [];
  const requests = [];
  const instances = [];
  const requestTypes = { PAGE: 'Page', HOLD: 'Hold', RECALL: 'Recall' };

  beforeEach(() => {
    cy.getAdminToken().then(() => {
      Object.values(requestTypes).forEach((requestType) => {
        const itemStatus =
          requestType === REQUEST_TYPES.PAGE
            ? ITEM_STATUS_NAMES.AVAILABLE
            : ITEM_STATUS_NAMES.CHECKED_OUT;
        Requests.createRequestApi(itemStatus, requestType).then(
          ({ instanceRecordData, createdRequest, createdUser }) => {
            userIds.push(createdUser.id);
            instances.push(instanceRecordData);
            requests.push(createdRequest);
          },
        );
      });
    });
    cy.loginAsAdmin();
  });

  afterEach(() => {
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
  it('C2379 Test Request app sorting (vega)', { tags: [TestTypes.smoke, DevTeams.vega] }, () => {
    cy.visit(TopMenu.requestsPath);

    cy.intercept('GET', '/circulation/requests?*').as('getRequests');

    Requests.checkAllRequestTypes();
    Requests.validateRequestTypesChecked();

    // Validate that the requests are sorted by Request date (oldest at top) by default
    Requests.validateRequestsDateSortingOrder('ascending');

    // Click column header Request Date to verify that they reverse sort
    cy.do(MultiColumnListHeader('Request Date').click());
    Requests.waitLoadingRequests();
    Requests.validateRequestsDateSortingOrder('descending');

    Requests.sortingColumns.forEach((column) => {
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
