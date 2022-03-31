import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import { Button, Checkbox, Pane } from '../../../interactors';

const dataExportPane = Pane({ title: 'Logs' });
const appsButton = Button({ id: 'app-list-dropdown-toggle' });
const requestsButton = Button('Requests');
const dataExportButton = Button('Data export');
const pagesCheckbox = Checkbox({ name: 'Page' });

describe('ui-requests: Make sure that request type filters are working properly', () => {
  const requests = [];
  const instances = [];
  const userIds = [];
  const resetFiltersMessage = 'Choose a filter or enter a search query to show results.';
  const doesNotExistRequest = `notExist-${uuid()}`;
  const getNoResultMessage = term => `No results found for "${term}". Please check your spelling and filters.`;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    Object.values(Requests.requestTypes).forEach(requestType => {
      const itemStatus = requestType === Requests.requestTypes.PAGE ? 'Available' : 'Checked out';
      Requests
        .createRequestApi(itemStatus, requestType)
        .then(({ instanceRecordData, createdRequest, createdUser }) => {
          requests.push(createdRequest);
          instances.push(instanceRecordData);
          userIds.push(createdUser.id);
        });
    });
  });

  after(() => {
    instances.forEach(instance => {
      cy.deleteItem(instance.itemId);
      cy.deleteHoldingRecord(instance.holdingId);
      cy.deleteInstanceApi(instance.instanceId);
    });
    requests.forEach(request => {
      Requests.deleteRequestApi(request.id);
    });
    userIds.forEach(id => {
      cy.deleteUser(id);
    });
  });

  it('C540 Make sure that request type filters are working properly', { tags: [TestTypes.smoke] }, () => {
    // Apply filters and test that the appropriate results display
    cy.visit(TopMenu.requestsPath);
    requests.forEach(request => {
      if (request.requestType === Requests.requestTypes.PAGE) {
        Requests.selectPagesRequestType();
      } else if (request.requestType === Requests.requestTypes.HOLD) {
        Requests.selectHoldsRequestType();
      } else if (request.requestType === Requests.requestTypes.RECALL) {
        Requests.selectRecallsRequestType();
      }
      Requests.waitUIFilteredByRequestType();
      Requests.verifyFilteredResults(request.requestType);
      Requests.resetAllFilters();
    });

    // Verify good message display when no results found
    Requests.selectRecallsRequestType();
    Requests.findCreatedRequest(doesNotExistRequest);
    Requests.verifyNoResultMessage(getNoResultMessage(doesNotExistRequest));
    Requests.resetAllFilters();

    // Navigate to other apps and back to ensure the filters are saved
    Requests.selectPagesRequestType();
    Requests.waitUIFilteredByRequestType();
    cy.do([appsButton.click(), dataExportButton.click()]);
    cy.expect(dataExportPane.exists());
    cy.do([appsButton.click(), requestsButton.click()]);
    // cy.expect(Checkbox(pagesCheckbox).has({ checked: true }));
    Requests.verifyFilteredResults(Requests.requestTypes.PAGE);

    // Test reset all button
    Requests.resetAllFilters();
    Requests.verifyNoResultMessage(resetFiltersMessage);

    // Test that filters and search terms work well together
    requests.forEach(request => {
      if (request.requestType === Requests.requestTypes.PAGE) {
        Requests.selectPagesRequestType();
      } else if (request.requestType === Requests.requestTypes.HOLD) {
        Requests.selectHoldsRequestType();
      } else if (request.requestType === Requests.requestTypes.RECALL) {
        Requests.selectRecallsRequestType();
      }
      Requests.waitUIFilteredByRequestType();
      Requests.findCreatedRequest(request.instance.title);
      Requests.verifyCreatedRequest(request.instance.title);
      Requests.resetAllFilters();
    });
  });
});
