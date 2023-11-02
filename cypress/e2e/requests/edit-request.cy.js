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
  let requestPolicyId;

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  beforeEach(() => {
    Requests.setRequestPolicyApi().then(({ policy }) => {
      requestPolicyId = policy.id;
    });
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
    EditRequest.updateRequestApi({
      ...requestData,
      status: 'Closed - Cancelled',
      cancelledByUserId: requestData.requesterId,
      cancellationReasonId: cancellationReason,
      cancelledDate: new Date().toISOString(),
    });
    Users.deleteViaApi(userId);
    Requests.deleteRequestPolicyApi(requestPolicyId);
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
