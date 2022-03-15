import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';


describe('Assign Tags to Request', () => {
  const barcode = uuid();
  const lastName = `Test-${uuid()}`;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');

    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
    cy.getUserGroups({ limit: 1 });

    cy.visit(TopMenu.requestsPath);
  });

  beforeEach(() => {
    const userData = {
      active: true,
      barcode,
      personal: {
        preferredContactTypeId: '002',
        lastName,
        email: 'test@folio.org',
      },
      patronGroup: Cypress.env('userGroups')[0].id,
      departments: []
    };
    cy.createUserApi(userData);

    cy.getItems({ limit: 1, query: 'status.name=="Available"' });
  });

  afterEach(() => {
    Requests.removeCreatedRequest();

    cy.getUsers({ query: `personal.lastName="${lastName}"` })
      .then(() => {
        Cypress.env('users').forEach(user => {
          cy.deleteUser(user.id);
        });
      });
  });

  it('C747 Assign Tags to Request', () => {
    const requestRecord = {
      itemBarcode: Cypress.env('items')[0].barcode,
      itemTitle: Cypress.env('items')[0].title,
      requesterBarcode: barcode,
      pickupServicePoint: 'Circ Desk 1',
    };

    NewRequest.createNewRequest(requestRecord);

    Requests.selectAllOpenRequests();
    Requests.findCreatedRequest(requestRecord.itemTitle);
    Requests.selectFirstRequest();
    Requests.openTagsPane();
    Requests.selectTags();

    Requests.closePane('Tags');
    Requests.closePane('Request Detail');

    Requests.selectFirstRequest();
    Requests.openTagsPane();

    Requests.verifyAssignedTags();
  });
});
