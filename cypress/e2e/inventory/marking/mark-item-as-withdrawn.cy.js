import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import markItemAsWithdrawn from '../../../support/fragments/inventory/markItemAsWithdrawn';
import markItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../../support/fragments/requests/requests';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';

describe('inventory', () => {
  describe('Item', () => {
    let user = {};
    let defaultServicePointId = '';
    const requesterIds = [];
    let instanceData = {};
    const createdRequestsIds = [];
    let createdItems = [];
    let materialType = '';
    let addedCirculationRule;
    let originalCirculationRules;

    before(() => {
      let materialBookId;
      cy.getAdminToken();
      cy.getMaterialTypes({ query: 'name="video recording"' }).then((type) => {
        materialBookId = type.id;
      });
      CirculationRules.getViaApi().then((circulationRule) => {
        originalCirculationRules = circulationRule.rulesAsText;
        const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
        const defaultProps = ` i ${ruleProps.i} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n} l ${ruleProps.l}`;
        addedCirculationRule = ` \nm ${materialBookId}: ${defaultProps}`;
        cy.updateCirculationRules({
          rulesAsText: `${originalCirculationRules}${addedCirculationRule}`,
        });
      });
    });

    beforeEach(() => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            defaultServicePointId = res[0].id;
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uiInventoryMarkItemsWithdrawn.gui,
            Permissions.uiRequestsCreate.gui,
            Permissions.uiInventoryViewInstances.gui,
          ]);
        })
        .then((userProperties) => {
          user = userProperties;
          UserEdit.addServicePointViaApi(defaultServicePointId, user.userId);
        })
        .then(() => {
          cy.login(user.username, user.password);
        })
        .then(() => {
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
        });
    });

    after(() => {
      CirculationRules.deleteRuleViaApi(addedCirculationRule);
    });

    afterEach(() => {
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

    it(
      'C10930: Mark items as withdrawn (folijet) (prokopovych)',

      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        cy.visit(TopMenu.inventoryPath);
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

        cy.visit(TopMenu.requestsPath);
        markItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
          Requests.findCreatedRequest(item.barcode);
          Requests.selectFirstRequest(item.barcode);
          markItemAsMissing.verifyRequestStatus('Open - Not yet filled');
        });

        cy.visit(TopMenu.inventoryPath);
        markItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
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
