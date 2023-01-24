import TestTypes from '../../support/dictionary/testTypes';
import EditRequest from '../../support/fragments/requests/edit-request';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-requests: Request: Edit requests. Make sure that edits are being saved.', () => {
  let userId;
  let requestData;
  let instanceData;
  let cancellationReason;
  let oldRulesText;
  let requestPolicyId;
  let servicePointName;

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  beforeEach(() => {
    Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
      oldRulesText = oldRulesAsText;
      requestPolicyId = policy.id;
    });
    Requests.createRequestApi().then(({
      createdUser,
      createdRequest,
      instanceRecordData,
      cancellationReasonId
    }) => {
      servicePointName = createdRequest.pickupServicePoint.name;
      userId = createdUser.id;
      requestData = createdRequest;
      instanceData = instanceRecordData;
      cancellationReason = cancellationReasonId;
    });
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
    Requests.updateCirculationRulesApi(oldRulesText);
    Requests.deleteRequestPolicyApi(requestPolicyId);
  });

  it('C556 Request: Edit requests. Make sure that edits are being saved. (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.requestsPath);
    Object.values(EditRequest.requestStatuses).forEach(status => {
      EditRequest.checkIsEditsBeingSaved(servicePointName, requestData, instanceData, status);
      EditRequest.resetFiltersAndReloadPage();
    });
  });
});
