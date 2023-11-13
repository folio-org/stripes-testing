import TestTypes from '../../support/dictionary/testTypes';
import EditRequest from '../../support/fragments/requests/edit-request';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';
import Parallelization from '../../support/dictionary/parallelization';

describe('ui-requests: Request: Edit requests. Make sure that edits are being saved.', () => {
  let userId;
  let requestData;
  let instanceData;
  let cancellationReason;

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  beforeEach(() => {
    Requests.createRequestApi().then(
      ({ createdUser, createdRequest, instanceRecordData, cancellationReasonId }) => {
        userId = createdUser.id;
        requestData = createdRequest;
        instanceData = instanceRecordData;
        cancellationReason = cancellationReasonId;
      },
    );
  });

  afterEach(() => {
    cy.getAdminToken();
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    Users.deleteViaApi(userId);
  });

  it(
    'C556 Request: Edit requests. Make sure that edits are being saved. (vega)',
    { tags: [TestTypes.smoke, DevTeams.vega, Parallelization.nonParallel] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Object.values(EditRequest.requestStatuses).forEach((status) => {
        EditRequest.checkIsEditsBeingSaved(requestData, instanceData, status);
        EditRequest.resetFiltersAndReloadPage();
      });
    },
  );
});
