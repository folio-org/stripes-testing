import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Helper from '../../support/fragments/finance/financeHelper';
import Orders from '../../support/fragments/orders/orders';
import InventoryInteractionsDefaults from '../../support/fragments/settings/orders/inventoryInteractionsDefaults';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import InteractorsTools from '../../support/utils/interactorsTools';
import Receiving from '../../support/fragments/receiving/receiving';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import Users from '../../support/fragments/users/users';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('inventory', () => {
  describe('Cataloging -> Creating new records', () => {
    const testData = {
      instanceTitle: `autotestTitle ${Helper.getRandomBarcode()}`,
      itemQuantity: '1',
      barcode: Helper.getRandomBarcode(),
      caption: 'autotestCaption',
      loanType: 'Can circulate',
      firstServicePoint: NewServicePoint.getDefaultServicePoint(
        `autotestServicePoint ${Helper.getRandomBarcode()}`,
      ),
      secondServicePoint: NewServicePoint.getDefaultServicePoint(
        `autotestServicePoint ${Helper.getRandomBarcode()}`,
      ),
    };

    before('create test data', () => {
      cy.getAdminToken();
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==approvals)',
      }).then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module: 'ORDERS',
            configName: 'approvals',
            enabled: true,
            value: '{"isApprovalRequired":false}',
          });
        }
      });
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==inventory-loanTypeName)',
      }).then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module: 'ORDERS',
            configName: 'inventory-loanTypeName',
            enabled: true,
            value: testData.loanType,
          });
        }
      });
      cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
        testData.materialTypeId = materialType.id;
      });
      ServicePoints.createViaApi(testData.firstServicePoint);
      NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.firstServicePoint.id)).then(
        (location) => {
          testData.effectiveLocation = location;
          Orders.createOrderWithOrderLineViaApi(
            NewOrder.getDefaultOrder(),
            BasicOrderLine.getDefaultOrderLine({
              quantity: testData.itemQuantity,
              title: testData.instanceTitle,
              specialLocationId: testData.effectiveLocation.id,
              specialMaterialTypeId: testData.materialTypeId,
            }),
          ).then((order) => {
            testData.orderNumber = order.poNumber;
          });
        },
      );
      ServicePoints.createViaApi(testData.secondServicePoint);

      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;

        UserEdit.addServicePointsViaApi(
          [testData.firstServicePoint.id, testData.secondServicePoint.id],
          testData.userId,
          testData.firstServicePoint.id,
        );
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        Orders.openOrder();
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${testData.orderNumber} has been successfully opened`,
        );
        Orders.receiveOrderViaActions();
        Receiving.selectFromResultsList(testData.instanceTitle);
        Receiving.receivePieceWithoutBarcode(0, testData.caption);
        Receiving.checkReceivedPiece(0, testData.caption, 'No value set-');
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${testData.orderNumber}"` }).then(
        (res) => {
          Orders.deleteOrderViaApi(res[0].id);
        },
      );
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      UserEdit.changeServicePointPreferenceViaApi(testData.userId, [
        testData.firstServicePoint.id,
        testData.secondServicePoint.id,
      ]).then(() => {
        ServicePoints.deleteViaApi(testData.firstServicePoint.id);
        ServicePoints.deleteViaApi(testData.secondServicePoint.id);
        Users.deleteViaApi(testData.userId);
      });
      NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
        testData.effectiveLocation.institutionId,
        testData.effectiveLocation.campusId,
        testData.effectiveLocation.libraryId,
        testData.effectiveLocation.id,
      );
    });

    it(
      'C3506 Catalog a new title which has been ordered and received in Orders (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(testData.effectiveLocation.name);
        InventoryInstance.verifyItemBarcode('No barcode');
        InventoryInstance.verifyLoan(testData.loanType);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode('-');
        InventoryItems.edit();
        ItemRecordEdit.waitLoading(testData.instanceTitle);
        ItemRecordEdit.addBarcode(testData.barcode);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(testData.barcode);

        cy.visit(TopMenu.checkInPath);
        CheckInActions.checkInItem(testData.barcode);
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          testData.instanceTitle,
        );
        // TODO need to wait until result is displayed
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1500);
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(testData.effectiveLocation.name);
        InventoryInstance.checkHoldingsTable(
          testData.effectiveLocation.name,
          0,
          '-',
          testData.barcode,
          ITEM_STATUS_NAMES.AVAILABLE,
        );
        InventoryInstance.verifyLoan(testData.loanType);
        InventoryInstance.openItemByBarcode(testData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(testData.barcode);

        SwitchServicePoint.switchServicePoint(testData.secondServicePoint.name);
        cy.visit(TopMenu.checkInPath);
        CheckInActions.checkInItem(testData.barcode);
        ConfirmItemInModal.confirmInTransitModal();
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          testData.instanceTitle,
        );
        // TODO need to wait until result is displayed
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1500);
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(testData.effectiveLocation.name);
        InventoryInstance.checkHoldingsTable(
          testData.effectiveLocation.name,
          0,
          '-',
          testData.barcode,
          'In transit',
        );
        InventoryInstance.verifyLoan(testData.loanType);
        InventoryInstance.openItemByBarcode(testData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(testData.barcode);
      },
    );
  });
});
