import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import createPageTypeRequest from '../../support/fragments/inventory/createPageTypeRequest';
import Requests from '../../support/fragments/requests/requests';

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
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
          defaultServicePointId = servicePoints[0].id;
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
          permissions.uiUserRequestsAll.gui,
          permissions.requestsAll.gui
        ], 'faculty');
      })
      .then(userProperties => {
        user = userProperties;
        cy.addServicePointToUser(defaultServicePointId, user.userId);
      })
      .then(() => {
        cy.login(user.username, user.password);
      })
      .then(() => {
        createPageTypeRequest
          .createItemsForGivenStatusesApi()
          .then(({ item, instanceRecordData }) => {
            createdItem = item;
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
        createPageTypeRequest.deleteRequestApi(request.id);
      });
    });
    cy.deleteItem(createdItem.itemId);
    cy.deleteHoldingRecord(instanceData.holdingId);
    cy.deleteInstanceApi(instanceData.instanceId);
    cy.deleteUser(user.userId);
    Requests.updateCirculationRulesApi(oldRulesText);
    Requests.deleteRequestPolicyApi(requestPolicyId);
  });

  it('C546: create a page type request for an Available item', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.inventoryPath);
    createPageTypeRequest.findAvailableItem(instanceData, createdItem.barcode);
    createPageTypeRequest.clickNewRequest(createdItem.barcode);
    createPageTypeRequest.selectActiveFacultyUser(user.username);
    createPageTypeRequest.saveAndClose();
    createPageTypeRequest.clickItemBarcodeLink(createdItem.barcode);
    createPageTypeRequest.verifyrequestsCountOnItemRecord();
    createPageTypeRequest.clickRequestsCountLink();
    createPageTypeRequest.clickRequesterBarcode(user.username);
    createPageTypeRequest.verifyOpenRequestCounts();
    createPageTypeRequest.clickOpenRequestsCountLink();
  });
});
