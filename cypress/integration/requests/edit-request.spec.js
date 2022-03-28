import TestTypes from '../../support/dictionary/testTypes';
import EditRequest from '../../support/fragments/requests/edit-request';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-requests: Request: Edit requests. Make sure that edits are being saved.', () => {
  let userData;
  let requestData;
  let instanceData;
  let cancellationReason;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    cy.createRequestApi().then(({
      createdUser,
      createdRequest,
      instanceRecordData,
      cancellationReasonId
    }) => {
      userData = createdUser;
      requestData = createdRequest;
      instanceData = instanceRecordData;
      cancellationReason = cancellationReasonId;
    });
  });

  afterEach(() => {
    cy.changeItemRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    cy.deleteUser(userData.id);
  });

  it('C556 Request: Edit requests. Make sure that edits are being saved.', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.requestsPath);
    Object.values(EditRequest.requestStatuses).forEach(status => {
      EditRequest.checkIsEditsBeingSaved(requestData, instanceData, status);
      EditRequest.resetFiltersAndReloadPage();
    });
  });
});
