import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import MarkItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../../support/fragments/requests/requests';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-inventory: Mark an item as Missing', () => {
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
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
          .then((res) => {
            defaultServicePointId = res[0].id;
          });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiInventoryMarkAsMissing.gui,
          permissions.uiRequestsView.gui,
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
        MarkItemAsMissing
          .createItemsForGivenStatusesApi()
          .then(({ items, instanceRecordData, materialTypeValue }) => {
            createdItems = items;
            instanceData = instanceRecordData;
            materialType = materialTypeValue;
            MarkItemAsMissing.getItemsToCreateRequests(createdItems).forEach(item => {
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
      cy.deleteItemViaApi(item.itemId);
    });
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    createdRequestsIds.forEach(id => {
      Requests.deleteRequestViaApi(id);
    });
    Users.deleteViaApi(user.userId);
    requesterIds.forEach(id => Users.deleteViaApi(id));
  });

  it('C714 Mark an item as Missing (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
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

    cy.visit(TopMenu.requestsPath);
    MarkItemAsMissing.getItemsToCreateRequests(createdItems).forEach(item => {
      Requests.findCreatedRequest(item.barcode);
      Requests.selectFirstRequest(item.barcode);
      MarkItemAsMissing.verifyRequestStatus('Open - Not yet filled');
    });

    cy.visit(TopMenu.inventoryPath);
    MarkItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
    MarkItemAsMissing.getItemsNotToMarkAsMissing(createdItems).forEach(item => {
      MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
      MarkItemAsMissing.openItem(item.barcode);
      MarkItemAsMissing.checkIsMarkAsMissingExist(false);
      MarkItemAsMissing.closeItemView();
    });
  });
});
