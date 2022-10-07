import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import createPageTypeRequest from '../../support/fragments/inventory/createPageTypeRequest';
import Requests from '../../support/fragments/requests/requests';
import MarkItemAsMissing from '../../support/fragments/inventory/markItemAsMissing';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Create page type request', () => {
  let user;
  let defaultServicePointId;
  let instanceData = {};
  let createdItem;
  let oldRulesText;
  let requestPolicyId;

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
          .then((res) => {
            defaultServicePointId = res[0].id;
          });
      })
      .then(() => {
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUserCreate.gui,
          permissions.uiUsersEdituserservicepoints.gui,
          permissions.uiUserAccounts.gui,
          permissions.usersViewRequests.gui,
          permissions.requestsAll.gui
        ], 'faculty');
      })
      .then(userProperties => {
        user = userProperties;
        UserEdit.addServicePointViaApi(defaultServicePointId, user.userId);
      })
      .then(() => {
        cy.login(user.username, user.password);
      })
      .then(() => {
        MarkItemAsMissing
          .createItemsForGivenStatusesApi.call(createPageTypeRequest)
          .then(({ items, instanceRecordData }) => {
            createdItem = items[0];
            instanceData = instanceRecordData;
            cy.intercept('GET', '/circulation/requests?*').as('getRequests');
            cy.intercept('GET', '/users?*').as('getUsers');
            cy.intercept('POST', '/circulation/requests').as('postRequest');
            cy.intercept('GET', '/inventory/items?').as('getItems');
            cy.intercept('GET', '/holdings-types?*').as('getHoldinsgTypes');
            cy.intercept('GET', '/instance-relationship-types?*').as('getInstanceRelTypes');
          });
      });

    Requests.setRequestPolicyApi().then(({ oldRulesAsText, policy }) => {
      oldRulesText = oldRulesAsText;
      requestPolicyId = policy.id;
    });
  });

  afterEach(() => {
    cy.getItemRequestsApi({
      query: `"requesterId"="${user.userId}"`
    }).then(({ body }) => {
      body.requests?.forEach(request => {
        Requests.deleteRequestApi(request.id);
      });
    });
    cy.deleteItem(createdItem.itemId);
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    Users.deleteViaApi(user.userId);
    Requests.updateCirculationRulesApi(oldRulesText);
    Requests.deleteRequestPolicyApi(requestPolicyId);
  });

  it('C546: Create new request for "Page" type (vega)', { tags: [TestTypes.smoke, DevTeams.vega] }, () => {
    cy.visit(TopMenu.inventoryPath);
    createPageTypeRequest.findAvailableItem(instanceData, createdItem.barcode);
    createPageTypeRequest.clickNewRequest(createdItem.barcode);
    createPageTypeRequest.selectActiveFacultyUser(user.username);
    createPageTypeRequest.saveAndClose();
    cy.wait(['@postRequest']);
    createPageTypeRequest.clickItemBarcodeLink(createdItem.barcode);
    createPageTypeRequest.verifyRequestsCountOnItemRecord();
    createPageTypeRequest.clickRequestsCountLink();
    createPageTypeRequest.clickRequesterBarcode(user.username);
    createPageTypeRequest.verifyOpenRequestCounts();
    createPageTypeRequest.clickOpenRequestsCountLink();
  });
});
