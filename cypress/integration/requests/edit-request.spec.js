import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import EditRequest from '../../support/fragments/requests/edit-request';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-requests: Request: Edit requests. Make sure that edits are being saved.', () => {
  let userId;
  let cancellationReasonId;
  let createdRequest;
  const userData = {
    active: true,
    barcode: uuid(),
    personal: {
      preferredContactTypeId: '002',
      lastName: `testUser-${uuid()}`,
      email: 'test@folio.org',
    },
    departments: [],
    patronGroup: null,
  };
  const requestData = {
    'requestLevel': 'Item',
    'requestDate': new Date().toISOString(),
    'requestExpirationDate': new Date().toISOString(),
    'requesterId': null,
    'instanceId': null,
    'pickupServicePointId': null,
  };
  const instanceRecordData = {
    instanceTitle : `instanceTitle-${uuid()}`,
    itemBarcode : `item-barcode-${uuid()}`,
    instanceTypeId: null,
    holdingsTypeId: null,
    permanentLocationId: null,
    sourceId: null,
    permanentLoanTypeId: null,
    materialTypeId: null
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
      requestData.pickupServicePointId = servicePoints[0].id;
    });
    cy.getUserGroups({ limit: 1 }).then(patronGroup => {
      userData.patronGroup = patronGroup;
    });
    cy.getLoanTypes({ limit: 1 }).then(loanTypes => {
      instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
    });
    cy.getMaterialTypes({ limit: 1 }).then(materialType => {
      instanceRecordData.materialTypeId = materialType.id;
    });
    cy.getLocations({ limit: 1 }).then(location => {
      instanceRecordData.permanentLocationId = location.id;
    });
    cy.getHoldingTypes({ limit: 1 }).then(holdingsTypes => {
      instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
    });
    cy.getHoldingSources({ limit: 1 }).then(holdingsSources => {
      instanceRecordData.sourceId = holdingsSources[0].id;
    });
    cy.getInstanceTypes({ limit: 1 }).then(instanceTypes => {
      instanceRecordData.instanceTypeId = instanceTypes[0].id;
    });
    cy.getCancellationReasonsApi({ limit: 1 }).then(cancellationReasons => {
      cancellationReasonId = cancellationReasons[0].id;
    });
  });

  beforeEach(() => {
    cy.createUserApi(userData).then(user => {
      userId = user.id;
      requestData.requesterId = userId;
      cy.visit(TopMenu.requestsPath);
    });
  });

  afterEach(() => {
    cy.changeItemRequestApi({
      ...createdRequest,
      status: 'Closed - Cancelled',
      cancelledByUserId: userId,
      cancellationReasonId,
      cancelledDate: new Date().toISOString(),
    });
    cy.deleteUser(userId);
  });

  it('C556 Request: Edit requests. Make sure that edits are being saved.', { tags: [TestTypes.smoke] }, () => {
    EditRequest.createInstance(instanceRecordData).then(instanceId => {
      requestData.instanceId = instanceId;

      EditRequest.createRequest(requestData).then((request) => {
        createdRequest = request;

        Object.values(EditRequest.requestStatuses).forEach(status => {
          EditRequest.checkIsEditsBeingSaved(request, instanceRecordData, status);
          EditRequest.resetFiltersAndReloadPage();
        });
      });
    });
  });
});
