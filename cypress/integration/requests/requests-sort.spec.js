import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import { MultiColumnListHeader } from '../../../interactors';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-requests: Sort requests', () => {
  const userIds = [];
  const requests = [];
  const instances = [];
  let oldRulesText;
  let requestPolicyId;

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
      oldRulesText = oldRulesAsText;
      requestPolicyId = policy.id;
    });

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
      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    requests.forEach(request => {
      Requests.deleteRequestApi(request.id);
    });
    userIds.forEach(id => {
      Users.deleteViaApi(id);
    });
    Requests.updateCirculationRulesApi(oldRulesText);
    Requests.deleteRequestPolicyApi(requestPolicyId);
  });

  it('C2379 Test Request app sorting (folijet) (prokopovych)', { tags: [testType.smoke, DevTeams.folijet] }, () => {
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
