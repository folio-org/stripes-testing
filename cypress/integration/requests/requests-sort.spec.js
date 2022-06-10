import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import { MultiColumnListHeader } from '../../../interactors';
import Users from '../../support/fragments/users/users';

describe('ui-requests: Sort requests', () => {
  const userIds = [];
  const requests = [];
  const instances = [];

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');

    Object.values(Requests.requestTypes).forEach((requestType) => {
      const itemStatus = requestType === 'Page' ? 'Available' : 'Checked out';
      Requests.createRequestApi(itemStatus, requestType).then(({
        instanceRecordData,
        createdRequest,
        createdUser
      }) => {
        userIds.push(createdUser.id);
        instances.push(instanceRecordData);
        requests.push(createdRequest);
      });
    });
  });

  afterEach(() => {
    instances.forEach(instance => {
      cy.deleteItem(instance.itemId);
      cy.deleteHoldingRecord(instance.holdingId);
      cy.deleteInstanceApi(instance.instanceId);
    });
    requests.forEach(request => {
      Requests.deleteRequestApi(request.id);
    });
    userIds.forEach(id => {
      Users.deleteViaApi(id);
    });
  });

  it('C2379: Test Request app sorting', { tags: [testType.smoke] }, () => {
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

    Requests.sortingColumns.forEach(column => {
      // Validate sort
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerId: column.id, columnIndex: column.columnIndex });

      // Validate reverse sorting
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerId: column.id, columnIndex: column.columnIndex });
    });
  });
});
