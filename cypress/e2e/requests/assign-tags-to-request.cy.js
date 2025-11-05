import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import TagsGeneral from '../../support/fragments/settings/tags/tags-general';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  let userId;
  let requestData;
  let instanceData;
  const tag = 'important';

  before(() => {
    cy.getAdminToken().then(() => {
      Requests.createRequestApi().then(({ createdUser, createdRequest, instanceRecordData }) => {
        userId = createdUser.id;
        requestData = createdRequest;
        instanceData = instanceRecordData;
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `"title"=="${instanceData.instanceTitle}"`,
    }).then((instance) => {
      cy.deleteItemViaApi(instance.items[0].id);
      cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
      InventoryInstance.deleteInstanceViaApi(instance.id);
    });
    Requests.deleteRequestViaApi(requestData.id).then(() => {
      Users.deleteViaApi(userId);
    });
  });

  it(
    'C747 Assign Tags to Request (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeftBroken', 'C747'] },
    () => {
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.tagsGeneralPath,
          waiter: TagsGeneral.waitLoading,
        });
      });
      TagsGeneral.changeEnableTagsStatus('enable');
      cy.visit(TopMenu.requestsPath);
      Requests.selectNotYetFilledRequest();
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      Requests.openTagsPane();
      Requests.addTag(tag);
      Requests.closePane('Tags');
      Requests.closePane('Request details');
      Requests.resetAllFilters();
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      Requests.openTagsPane();
      Requests.verifyAssignedTags(tag);
      // cancel request for verifying tags can't be added or removed for a closed request
      Requests.cancelRequest();
      Requests.resetAllFilters();
      Requests.selectClosedCancelledRequest();
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      Requests.verifyShowTagsButtonIsDisabled();
    },
  );
});
