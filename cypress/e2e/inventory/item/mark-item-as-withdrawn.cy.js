import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import markItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import markItemAsWithdrawn from '../../../support/fragments/inventory/markItemAsWithdrawn';
import Requests from '../../../support/fragments/requests/requests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Item', () => {
    let user = {};
    let defaultServicePointId;
    const requesterIds = [];
    let instanceData = {};
    const createdRequestsIds = [];
    let createdItems = [];
    let materialType = '';
    let addedCirculationRule;

    before('Create test data and login', () => {
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

      cy.createTempUser([
        Permissions.uiInventoryMarkItemsWithdrawn.gui,
        Permissions.uiRequestsCreate.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
          defaultServicePointId = res[0].id;

          UserEdit.addServicePointViaApi(defaultServicePointId, user.userId);
        });
        markItemAsMissing.createItemsForGivenStatusesApi
          .call(markItemAsWithdrawn)
          .then(({ items, instanceRecordData, materialTypeValue }) => {
            createdItems = items;
            instanceData = instanceRecordData;
            materialType = materialTypeValue;
            markItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
              const requestStatus = markItemAsMissing.itemToRequestMap[item.status.name];
              markItemAsMissing
                .createRequestForGivenItemApi(item, instanceRecordData, requestStatus)
                .then(({ createdUserId, createdRequestId }) => {
                  createdRequestsIds.push(createdRequestId);
                  requesterIds.push(createdUserId);
                });
            });
          });
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    afterEach('Delete test data', () => {
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
      'C10930 Mark items as withdrawn (folijet)',
      { tags: ['smoke', 'folijet', 'C10930', 'shiftLeft'] },
      () => {
        markItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
        markItemAsMissing.getItemsToMarkAsMissing
          .call(markItemAsWithdrawn, createdItems)
          .forEach((item) => {
            markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
            markItemAsMissing.openItem(item.barcode);
            markItemAsWithdrawn.checkActionButtonExists({
              isExist: true,
              button: markItemAsWithdrawn.withdrawItemButton,
            });
            markItemAsWithdrawn.clickMarkAsWithdrawn();
            markItemAsWithdrawn.checkIsconfirmItemWithdrawnModalExist(
              instanceData.instanceTitle,
              item.barcode,
              materialType,
            );
            markItemAsWithdrawn.cancelModal();
            markItemAsMissing.verifyItemStatus(item.status.name);
            markItemAsWithdrawn.clickMarkAsWithdrawn();
            markItemAsWithdrawn.confirmModal();
            markItemAsMissing.verifyItemStatus('Withdrawn');
            markItemAsMissing.verifyItemStatusUpdatedDate();
            ItemRecordView.closeDetailView();
          });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
        markItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
          Requests.findCreatedRequest(item.barcode);
          Requests.selectFirstRequest(instanceData.instanceTitle);
          markItemAsMissing.verifyRequestStatus('Open - Not yet filled');
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        markItemAsMissing.getItemsNotToMarkAsMissing
          .call(markItemAsWithdrawn, createdItems)
          .forEach((item) => {
            markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
            markItemAsMissing.openItem(item.barcode);
            markItemAsWithdrawn.checkActionButtonExists({
              isExist: false,
              button: markItemAsWithdrawn.withdrawItemButton,
            });
            ItemRecordView.closeDetailView();
          });
        markItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
        markItemAsMissing.openItem(markItemAsWithdrawn.getWithdrawnItem(createdItems).barcode);
        markItemAsWithdrawn.checkActionButtonExists({
          isExist: false,
          button: markItemAsWithdrawn.newRequestButton,
        });
        ItemRecordView.closeDetailView();
      },
    );
  });
});
