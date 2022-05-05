import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import createPageTypeRequest from '../../support/fragments/inventory/createPageTypeRequest';

describe('ui-inventory: Create page type request', () => {
  let user;
  let defaultServicePointId;
  let instanceData = {};
  let createdItem;

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
          permissions.uiInventoryViewInstances,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUserCreate.gui,
          permissions.uiUsersEdituserservicepoints.gui,
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
  });

  it('C10930: create a new request with page type for an item with status Available', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.inventoryPath);
    createPageTypeRequest.findAndOpenInstance(instanceData.instanceTitle);
    createPageTypeRequest.openHoldingsAccordion(instanceData.holdingId);
    createPageTypeRequest.openItem(createdItem.barcode);
    createPageTypeRequest.clickNewRequest();
    createPageTypeRequest.clickRequesterLookUp();
    createPageTypeRequest.checkModalExists();
    createPageTypeRequest.filterRequesterLookup();
    createPageTypeRequest.selectUser(user.username);
    cy.wait('@getUsers');
    createPageTypeRequest.selectPickupServicePoint();
    createPageTypeRequest.saveAndClose();
    cy.wait(['@getUsers', '@postRequest']);
    createPageTypeRequest.clickItemBarcodeLink(createdItem.barcode);
    cy.wait(['@getInstanceRelTypes', '@getHoldinsgTypes', '@getRequests']);
    createPageTypeRequest.verifyPageTypeItem(createdItem.barcode);
    createPageTypeRequest.verifyrequestsCountLink();
    createPageTypeRequest.clickRequestsCountLink();
  });
});
