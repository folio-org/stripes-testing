import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import MarkItemAsMissing from '../../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../../support/fragments/requests/requests';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';
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
            Permissions.uiInventoryMarkAsMissing.gui,
            Permissions.uiRequestsView.gui,
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
      'C714 Mark an item as Missing (folijet) (prokopovych)',

      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        MarkItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
        MarkItemAsMissing.getItemsToMarkAsMissing(createdItems).forEach((item) => {
          MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
          MarkItemAsMissing.openItem(item.barcode);
          MarkItemAsMissing.checkIsMarkAsMissingExist(true);
          ItemActions.markAsMissing();
          MarkItemAsMissing.checkIsConfirmItemMissingModalExist(
            instanceData.instanceTitle,
            item.barcode,
            materialType,
          );
          ItemActions.cancelMarkAsMissing();
          ItemRecordView.verifyItemStatusInPane(item.status.name);
          ItemActions.markAsMissing();
          ItemActions.confirmMarkAsMissing();
          ItemRecordView.verifyItemStatusInPane('Missing');
          MarkItemAsMissing.verifyItemStatusUpdatedDate();
          ItemRecordView.closeDetailView();
        });

        cy.visit(TopMenu.requestsPath);
        MarkItemAsMissing.getItemsToCreateRequests(createdItems).forEach((item) => {
          Requests.findCreatedRequest(item.barcode);
          Requests.selectFirstRequest(item.barcode);
          MarkItemAsMissing.verifyRequestStatus('Open - Not yet filled');
        });

        cy.visit(TopMenu.inventoryPath);
        MarkItemAsMissing.findAndOpenInstance(instanceData.instanceTitle);
        MarkItemAsMissing.getItemsNotToMarkAsMissing(createdItems).forEach((item) => {
          MarkItemAsMissing.openHoldingsAccordion(instanceData.holdingId);
          MarkItemAsMissing.openItem(item.barcode);
          MarkItemAsMissing.checkIsMarkAsMissingExist(false);
          ItemRecordView.closeDetailView();
        });
      },
    );
  });
});
