import uuid from 'uuid';
import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import DevTeams from '../../support/dictionary/devTeams';
import Helper from '../../support/fragments/finance/financeHelper';

describe('ui-requests: Assign Tags to Request', () => {
  let userId;
  let requestData;
  let instanceData;
  let cancellationReason;
  let oldRulesText;
  let requestPolicyId;
  const tag = 'important';

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
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
          userId = createdUser.id;
          requestData = createdRequest;
          instanceData = instanceRecordData;
          cancellationReason = cancellationReasonId;
        });
      });
  });

  // afterEach(() => {
  //   Requests.getRequestIdViaApi({ limit:1, query: `item.barcode="${itemBarcode}"` })
  //     .then(requestId => {
  //       Requests.deleteRequestApi(requestId)
  //         .then(() => {
  //           Users.deleteViaApi(userId);
  //         });
  //     });
  //   Requests.updateCirculationRulesApi(oldRulesText);
  //   Requests.deleteRequestPolicyApi(requestPolicyId);
  // });

  it('C747 Assign Tags to Request (folijet) (prokopovych)', { tags:  [testType.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.requestsPath);
    Requests.selectNotYetFilledRequest();
    Requests.findCreatedRequest(instanceData.instanceTitle);
    Requests.selectFirstRequest(instanceData.instanceTitle);
    Requests.openTagsPane();
    Requests.selectTags(tag);
    Requests.closePane('Tags');
    Requests.closePane('Request Detail');
    Requests.findCreatedRequest(instanceData.instanceTitle);
    Requests.selectFirstRequest(instanceData.instanceTitle);
    Requests.openTagsPane();
    Requests.verifyAssignedTags(tag);

  });
});
