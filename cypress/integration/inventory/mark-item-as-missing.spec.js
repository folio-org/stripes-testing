import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import MarkItemAsMissing from '../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-inventory: Mark an item as Missing', () => {
  let userId = '';
  const requesterIds = [];
  let instanceData = {};
  const createdRequestsIds = [];
  let createdItems = [];
  let materialType = '';
  beforeEach(() => {
    cy.createTempUser([
      permissions.uiInventoryMarkAsMissing.gui,
      permissions.uiRequestsView.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    }).then(() => {
      MarkItemAsMissing
        .createItemsForGivenStatusesApi()
        .then(({ items, instanceRecordData, materialTypeValue }) => {
          createdItems = items;
          instanceData = instanceRecordData;
          materialType = materialTypeValue;
          const itemsToCreateRequests = items.filter(({ status: { name } }) => (name in MarkItemAsMissing.itemToRequestMap));
          itemsToCreateRequests.forEach(item => {
            const requestStatus = MarkItemAsMissing.itemToRequestMap[item.status.name];
            MarkItemAsMissing
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
    cy.deleteUser(userId);
    requesterIds.forEach(id => cy.deleteUser(id));
  });

  it('C714 Mark an item as Missing', { tags: [TestTypes.smoke] }, () => {
    cy.pause();
    cy.visit(TopMenu.inventoryPath);
    MarkItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
    MarkItemAsMissing.getItemsToMarkAsMissing(createdItems).forEach(item => {
      MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
      MarkItemAsMissing.openItem(item.barcode);
      MarkItemAsMissing.checkIsMarkAsMissingExist(true);
      MarkItemAsMissing.clickMarkAsMissing();
      MarkItemAsMissing.checkIsConfirmItemMissingModalExist(instanceData.instanceTitle, item.barcode, materialType);
      MarkItemAsMissing.cancelModal();
      MarkItemAsMissing.verifyItemStatus(item.status.name);
      MarkItemAsMissing.clickMarkAsMissing();
      MarkItemAsMissing.confirmModal();
      MarkItemAsMissing.verifyItemStatus('Missing');
      MarkItemAsMissing.verifyItemStatusUpdatedDate();
      MarkItemAsMissing.closeItemView();
    });
  });
});
