import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import withdrawItem from '../../support/fragments/inventory/withdrawItem';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-inventory: Mark an item as Missing', () => {
  let user = {};
  let defaultServicePointId = '';
  const requesterIds = [];
  let instanceData = {};
  const createdRequestsIds = [];
  let createdItems = [];
  let materialType = '';

  beforeEach(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
          defaultServicePointId = servicePoints[0].id;
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiInventoryMarkItemWithdrawn.gui,
          permissions.uiRequestsCreate.gui,
          permissions.uiInventoryViewInstances.gui,
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
        withdrawItem
          .createItemsForGivenStatusesApi()
          .then(({ items, instanceRecordData, materialTypeValue }) => {
            createdItems = items;
            instanceData = instanceRecordData;
            materialType = materialTypeValue;
            withdrawItem.getItemsToCreateRequests(createdItems).forEach(item => {
              const requestStatus = withdrawItem.itemToRequestMap[item.status.name];
              withdrawItem
                .createRequestForGivenItemApi(item, instanceRecordData, requestStatus)
                .then(({ createdUserId, createdRequestId }) => {
                  createdRequestsIds.push(createdRequestId);
                  requesterIds.push(createdUserId);
                });
            });
          });
      });
  });

  afterEach(() => {
    createdItems.forEach(item => {
      cy.deleteItem(item.itemId);
    });
    cy.deleteHoldingRecord(instanceData.holdingId);
    cy.deleteInstanceApi(instanceData.instanceId);
    createdRequestsIds.forEach(id => {
      Requests.deleteRequestApi(id);
    });
    cy.deleteUser(user.userId);
    requesterIds.forEach(id => cy.deleteUser(id));
  });

  it('C10930: Mark item withdrawn ', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.inventoryPath);
    withdrawItem.findAndOpenInstance(instanceData.instanceTitle);
    withdrawItem.getItemsToWithdraw(createdItems).forEach(item => {
      withdrawItem.openHoldingsAccordion(instanceData.holdingId);
      withdrawItem.openItem(item.barcode);
      withdrawItem.checkIsMarkAsWithdrawnExist(true);
      // withdrawItem.clickMarkAsMissing();
      // withdrawItem.checkIsConfirmItemMissingModalExist(instanceData.instanceTitle, item.barcode, materialType);
      // withdrawItem.cancelModal();
      // withdrawItem.verifyItemStatus(item.status.name);
      // withdrawItem.clickMarkAsMissing();
      // withdrawItem.confirmModal();
      // withdrawItem.verifyItemStatus('Missing');
      // withdrawItem.verifyItemStatusUpdatedDate();
      withdrawItem.closeItemView();
    });

    // cy.visit(TopMenu.requestsPath);
    // withdrawItem.getItemsToCreateRequests(createdItems).forEach(item => {
    //   Requests.findCreatedRequest(item.barcode);
    //   Requests.selectFirstRequest(item.barcode);
    //   withdrawItem.verifyRequestStatus('Open - Not yet filled');
    // });

    cy.visit(TopMenu.inventoryPath);
    withdrawItem.findAndOpenInstance(instanceData.instanceTitle);
    withdrawItem.getItemsNotToWithdraw(createdItems).forEach(item => {
      withdrawItem.openHoldingsAccordion(instanceData.holdingId);
      withdrawItem.openItem(item.barcode);
      withdrawItem.checkIsMarkAsWithdrawnExist(false);
      withdrawItem.closeItemView();
    });
  });
});
