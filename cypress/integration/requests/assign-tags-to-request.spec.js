import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';

describe('Assign Tags to Request', () => {
  const requestRecord = {
    itemBarcode: '90000',
    itemTitle: 'A semantic web primer',
    requesterBarcode: '789',
    pickupServicePoint: 'Circ Desk 1',
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.requestsPath);
  });

  it('C747 Assign Tags to Request', () => {
    NewRequest.createNewRequest(requestRecord);
    Requests.selectAllOpenRequests();
    Requests.findCreatedRequest(requestRecord.itemTitle);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    Requests.selectFirstRequest();
    Requests.openTagsPane();
    Requests.selectTags();

    Requests.closePane('Tags');
    Requests.closePane('Request Detail');

    Requests.selectFirstRequest();
    Requests.openTagsPane();

    Requests.verifyAssignedTags();

    Requests.removeCreatedRequest();
  });
});
