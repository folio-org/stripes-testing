import uuid from 'uuid';
import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';
import Users from '../../support/fragments/users/users';


describe('Assign Tags to Request', () => {
  const barcode = uuid();
  const lastName = `Test-${uuid()}`;
  const tag = 'urgent';
  const requestRecord = {
    itemBarcode: null,
    itemTitle: null,
    requesterBarcode: barcode,
    pickupServicePoint: 'Circ Desk 1',
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');
    cy.visit(TopMenu.requestsPath);
  });

  beforeEach(() => {
    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
    cy.getUserGroups({ limit: 1 }).then((patronGroup) => {
      const userData = {
        active: true,
        barcode,
        personal: {
          preferredContactTypeId: '002',
          lastName,
          email: 'test@folio.org',
        },
        patronGroup,
        departments: []
      };
      Users.createViaApi(userData);
    });

    cy.getItems({ limit: 1, query: 'status.name=="Available"' }).then((item) => {
      requestRecord.itemBarcode = item.barcode;
      requestRecord.itemTitle = item.title;
    });
  });

  afterEach(() => {
    Requests.removeCreatedRequest();

    cy.getUsers({ query: `personal.lastName="${lastName}"` })
      .then(() => {
        Cypress.env('users').forEach(user => {
          Users.deleteViaApi(user.id);
        });
      });
  });

  it('C747 Assign Tags to Request', { tags:  [testType.smoke] }, () => {
    NewRequest.createNewRequest(requestRecord);

    Requests.selectNotYetFilledRequest();
    Requests.findCreatedRequest(requestRecord.itemTitle);
    Requests.selectFirstRequest(requestRecord.itemTitle);
    Requests.openTagsPane();
    Requests.selectTags(tag);
    Requests.closePane('Tags');
    Requests.closePane('Request Detail');

    Requests.selectFirstRequest(requestRecord.itemTitle);
    Requests.openTagsPane();

    Requests.verifyAssignedTags(tag);
  });
});
