import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import { Pane } from '../../../interactors';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('ui-requests: Make sure that request type filters are working properly', () => {
  const requests = [];
  const instances = [];
  const userIds = [];
  let oldRulesText;
  let requestPolicyId;
  const resetFiltersMessage = 'Choose a filter or enter a search query to show results.';
  const doesNotExistRequest = `notExist-${uuid()}`;
  const getNoResultMessage = term => `No results found for "${term}". Please check your spelling and filters.`;

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();

    Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
      oldRulesText = oldRulesAsText;
      requestPolicyId = policy.id;
    });

    Object.values(Requests.requestTypes).forEach(requestType => {
      const itemStatus = requestType === 'Page' ? 'Available' : 'Checked out';
      Requests
        .createRequestApi(itemStatus, requestType)
        .then(({ instanceRecordData, createdRequest, createdUser }) => {
          requests.push(createdRequest);
          instances.push(instanceRecordData);
          userIds.push(createdUser.id);
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

  it('C540 Make sure that request type filters are working properly', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.requestsPath);
    // Apply filters and test that the appropriate results display
    requests.forEach(({ requestType }) => {
      Requests.checkRequestType(requestType);
      Requests.waitUIFilteredByRequestType();
      Requests.verifyIsFilteredByRequestType(requestType);
      Requests.resetAllFilters();
    });

    // Verify good message displayed when no results found
    requests.forEach(({ requestType }) => {
      Requests.checkRequestType(requestType);
      Requests.findCreatedRequest(doesNotExistRequest);
      Requests.verifyNoResultMessage(getNoResultMessage(doesNotExistRequest));
      Requests.resetAllFilters();
    });

    // Navigate to other apps and back to ensure the filters are saved
    requests.forEach(({ requestType }) => {
      Requests.checkRequestType(requestType);
      Requests.waitUIFilteredByRequestType();
      Requests.verifyIsFilteredByRequestType(requestType);
      Requests.navigateToApp('Data export');
      cy.expect(Pane({ title: 'Logs' }).exists());
      Requests.navigateToApp('Requests');
      Requests.verifyRequestTypeChecked(requestType);
      Requests.verifyIsFilteredByRequestType(requestType);
      Requests.resetAllFilters();
    });

    // Test reset all button
    requests.forEach(({ requestType }) => {
      Requests.checkRequestType(requestType);
      Requests.resetAllFilters();
      Requests.verifyNoResultMessage(resetFiltersMessage);
    });


    // Test that filters and search terms work well together
    requests.forEach(({ requestType, instance: { title } }) => {
      Requests.checkRequestType(requestType);
      Requests.waitUIFilteredByRequestType();
      Requests.findCreatedRequest(title);
      Requests.verifyCreatedRequest(title);
      Requests.resetAllFilters();
    });
  });
});
