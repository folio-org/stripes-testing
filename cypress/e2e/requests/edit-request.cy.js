import EditRequest from '../../support/fragments/requests/edit-request';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Requests', () => {
  let userId;
  let requestData;
  let instanceData;
  let cancellationReason;

  before(() => {
    cy.getAdminToken();
    Requests.createRequestApi().then(
      ({ createdUser, createdRequest, instanceRecordData, cancellationReasonId }) => {
        userId = createdUser.id;
        requestData = createdRequest;
        instanceData = instanceRecordData;
        cancellationReason = cancellationReasonId;
      },
    );

    UserEdit.setupUserDefaultServicePoints(Cypress.env('diku_login'));
  });

  after(() => {
    cy.getAdminToken();
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    Requests.deleteRequestViaApi(requestData.id);
    Users.deleteViaApi(userId);
  });

  it(
    'C556 Request: Edit requests. Make sure that edits are being saved. (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C556'] },
    () => {
      [
        EditRequest.requestStatuses.AWAITING_DELIVERY,
        EditRequest.requestStatuses.AWAITING_PICKUP,
        EditRequest.requestStatuses.IN_TRANSIT,
        EditRequest.requestStatuses.NOT_YET_FILLED,
      ].forEach((status) => {
        cy.loginAsAdmin({ path: TopMenu.requestsPath, waiter: Requests.waitLoading });
        EditRequest.checkIsEditsBeingSaved(requestData, instanceData, status);
        // EditRequest.resetFiltersAndReloadPage();
      });
    },
  );
});
