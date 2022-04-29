import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import createPageTypeRequest from '../../support/fragments/inventory/createPageTypeRequest';

describe('ui-inventory: Create page type request', () => {
  let user = {};
  let defaultServicePointId = '';
  let instanceData = {};
  let createdItem = '';

  beforeEach(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
          defaultServicePointId = servicePoints[0].id;
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUserCreate.gui,
          permissions.uiUsersEdituserservicepoints.gui,
          permissions.requestsAll.gui
        ]);
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
          });
      });
  });

  afterEach(() => {
    cy.deleteItem(createdItem);
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
  });
});
