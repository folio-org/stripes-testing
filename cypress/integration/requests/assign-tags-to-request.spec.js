import uuid from 'uuid';
import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';

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
  let itemBarcode;
  let userId;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');
    cy.visit(TopMenu.requestsPath);
  });

  beforeEach(() => {
    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
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
      Users.createViaApi(userData)
        .then(userProperties => {
          userId = userProperties.id;
        });
    });

    cy.getItems({ limit: 1, query: 'status.name=="Available"' }).then((item) => {
      itemBarcode = item.barcode;
      requestRecord.itemBarcode = itemBarcode;
      requestRecord.itemTitle = item.title;
    });
  });

  afterEach(() => {
    Requests.getRequestIdViaApi({ limit:1, query: `item.barcode="${itemBarcode}"` })
      .then(requestId => {
        Requests.deleteRequestApi(requestId)
          .then(() => {
            Users.deleteViaApi(userId);
          });
      });
  });

  it('C747 Assign Tags to Request', { tags:  [testType.smoke, testType.broken] }, () => {
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
