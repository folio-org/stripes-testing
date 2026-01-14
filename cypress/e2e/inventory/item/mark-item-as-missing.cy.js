import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import MarkItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../../support/fragments/requests/requests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Item', () => {
    let user = {};
    let defaultServicePointId = '';
    const requesterIds = [];
    let instanceData = {};
    const createdRequestsIds = [];
    let createdItems = [];
    let materialType = '';
    let addedCirculationRule;

    before(() => {
      let materialBookId;
      cy.getAdminToken();
      cy.getMaterialTypes({ query: 'name="video recording"' })
        .then((type) => {
          materialBookId = type.id;
        })
        .then(() => {
          CirculationRules.addRuleViaApi({ m: materialBookId }, {}).then((newRule) => {
            addedCirculationRule = newRule;
          });
        });
    });

    beforeEach('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventoryMarkAsMissing.gui,
        Permissions.uiRequestsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
          defaultServicePointId = res[0].id;

          UserEdit.addServicePointViaApi(defaultServicePointId, user.userId);
        });
        MarkItemAsMissing.createItemsForGivenStatusesApi().then(
          ({ items, instanceRecordData, materialTypeValue }) => {
            createdItems = items;
            instanceData = instanceRecordData;
            materialType = materialTypeValue;
            MarkItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
              const requestStatus = MarkItemAsMissing.itemToRequestMap[item.status.name];
              MarkItemAsMissing.createRequestForGivenItemApi(
                item,
                instanceRecordData,
                requestStatus,
              ).then(({ createdUserId, createdRequestId }) => {
                createdRequestsIds.push(createdRequestId);
                requesterIds.push(createdUserId);
              });
            });
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        CirculationRules.deleteRuleViaApi(addedCirculationRule);
        createdItems.forEach((item) => {
          cy.deleteItemViaApi(item.itemId);
        });
        cy.deleteHoldingRecordViaApi(instanceData.holdingId);
        InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
        createdRequestsIds.forEach((id) => {
          Requests.deleteRequestViaApi(id);
        });
        Users.deleteViaApi(user.userId);
        requesterIds.forEach((id) => Users.deleteViaApi(id));
      });
    });

    it(
      'C714 Mark an item as Missing (folijet)',
      { tags: ['smoke', 'folijet', 'C714', 'shiftLeft'] },
      () => {
        MarkItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
        MarkItemAsMissing.getItemsToMarkAsMissing(createdItems).forEach((item) => {
          MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
          MarkItemAsMissing.openItem(item.barcode);
          MarkItemAsMissing.checkIsMarkAsMissingExist(true);
          InventoryItems.markAsMissing();
          MarkItemAsMissing.checkIsConfirmItemMissingModalExist(
            instanceData.instanceTitle,
            item.barcode,
            materialType,
          );
          InventoryItems.cancelMarkAsMissing();
          ItemRecordView.verifyItemStatusInPane(item.status.name);
          InventoryItems.markAsMissing();
          InventoryItems.confirmMarkAsMissing();
          ItemRecordView.verifyItemStatusInPane('Missing');
          MarkItemAsMissing.verifyItemStatusUpdatedDate();
          ItemRecordView.closeDetailView();
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        MarkItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
          Requests.findCreatedRequest(item.barcode);
          Requests.selectFirstRequest(instanceData.instanceTitle);
          MarkItemAsMissing.verifyRequestStatus('Open - Not yet filled');
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        MarkItemAsMissing.getItemsNotToMarkAsMissing(createdItems).forEach((item) => {
          MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
          MarkItemAsMissing.openItem(item.barcode);
          MarkItemAsMissing.checkIsMarkAsMissingExist(false);
          ItemRecordView.closeDetailView();
          cy.wait(1000); // wait for modal to be closed
        });
      },
    );
  });
});
