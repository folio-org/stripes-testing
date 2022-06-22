import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import markItemAsWithdrawn from '../../support/fragments/inventory/markItemAsWithdrawn';
import markItemAsMissing from '../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';

describe('ui-inventory: Mark items as withdrawn', () => {
  let user = {};
  let defaultServicePointId = '';
  const requesterIds = [];
  let instanceData = {};
  const createdRequestsIds = [];
  let createdItems = [];
  let materialType = '';

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
          defaultServicePointId = servicePoints[0].id;
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiInventoryMarkItemsWithdrawn.gui,
          permissions.uiRequestsCreate.gui,
          permissions.uiInventoryViewInstances.gui,
        ]);
      })
      .then(userProperties => {
        user = userProperties;
        UserEdit.addServicePointViaApi(defaultServicePointId, user.userId);
      })
      .then(() => {
        cy.login(user.username, user.password);
      })
      .then(() => {
        markItemAsMissing
          .createItemsForGivenStatusesApi.call(markItemAsWithdrawn)
          .then(({ items, instanceRecordData, materialTypeValue }) => {
            createdItems = items;
            instanceData = instanceRecordData;
            materialType = materialTypeValue;
            markItemAsMissing.getItemsToCreateRequests(createdItems).forEach(item => {
              const requestStatus = markItemAsMissing.itemToRequestMap[item.status.name];
              markItemAsMissing
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
    Users.deleteViaApi(user.userId);
    requesterIds.forEach(id => Users.deleteViaApi(id));
  });

  it('C10930: Mark items as withdrawn ', { tags: [TestTypes.smoke, TestTypes.broken] }, () => {
    cy.visit(TopMenu.inventoryPath);
    markItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
    markItemAsMissing.getItemsToMarkAsMissing.call(markItemAsWithdrawn, createdItems).forEach(item => {
      markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
      markItemAsMissing.openItem(item.barcode);
      markItemAsWithdrawn.checkActionButtonExists({ isExist: true, button: markItemAsWithdrawn.withdrawItemButton });
      markItemAsWithdrawn.clickMarkAsWithdrawn();
      markItemAsWithdrawn.checkIsconfirmItemWithdrawnModalExist(instanceData.instanceTitle, item.barcode, materialType);
      markItemAsWithdrawn.cancelModal();
      markItemAsMissing.verifyItemStatus(item.status.name);
      markItemAsWithdrawn.clickMarkAsWithdrawn();
      markItemAsWithdrawn.confirmModal();
      markItemAsMissing.verifyItemStatus('Withdrawn');
      markItemAsMissing.verifyItemStatusUpdatedDate();
      markItemAsMissing.closeItemView();
    });

    cy.visit(TopMenu.requestsPath);
    markItemAsMissing.getItemsToCreateRequests(createdItems).forEach(item => {
      Requests.findCreatedRequest(item.barcode);
      Requests.selectFirstRequest(item.barcode);
      markItemAsMissing.verifyRequestStatus('Open - Not yet filled');
    });

    cy.visit(TopMenu.inventoryPath);
    markItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
    markItemAsMissing.getItemsNotToMarkAsMissing.call(markItemAsWithdrawn, createdItems).forEach(item => {
      markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
      markItemAsMissing.openItem(item.barcode);
      markItemAsWithdrawn.checkActionButtonExists({ isExist: false, button: markItemAsWithdrawn.withdrawItemButton });
      markItemAsMissing.closeItemView();
    });

    markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
    markItemAsMissing.openItem(markItemAsWithdrawn.getWithdrawnItem(createdItems).barcode);
    markItemAsWithdrawn.checkActionButtonExists({ isExist: false, button: markItemAsWithdrawn.newRequestButton });
    markItemAsMissing.closeItemView();
  });
});
