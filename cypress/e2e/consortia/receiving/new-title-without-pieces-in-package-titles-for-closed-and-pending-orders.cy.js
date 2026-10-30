import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
} from '../../../support/constants';
import { tenantNames } from '../../../support/dictionary/affiliations';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SelectOrderLinesModal from '../../../support/fragments/invoices/modal/selectOrderLinesModal';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../../support/fragments/receiving/receivingDetails';
import ReceivingEditForm from '../../../support/fragments/receiving/receivingEditForm';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Receiving', () => {
  describe('Consortium (Receiving)', () => {
    const testData = {};

    before('Create test data', () => {
      const randomPostfix = getRandomPostfix();
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C468239_Organization_${randomPostfix}`,
      };
      testData.cancelledOrder = {
        packageName: `AT_C468239_PackagePOL_Cancelled_${randomPostfix}`,
        titleName: `AT_C468239_Title_Cancelled_${randomPostfix}`,
      };
      testData.pendingOrder = {
        packageName: `AT_C468239_PackagePOL_Pending_${randomPostfix}`,
        titleName: `AT_C468239_Title_Pending_${randomPostfix}`,
      };

      cy.getAdminToken();
      Locations.getViaApiAnyDefault().then((locations) => {
        [testData.location] = locations;
      });
      cy.getBookMaterialType().then((materialType) => {
        testData.materialTypeId = materialType.id;
      });
      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }).then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;
      });
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        [testData.cancelledOrder, testData.pendingOrder].forEach((orderData) => {
          Orders.createOrderViaApi(
            NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
          ).then((order) => {
            orderData.order = order;

            OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.getDefaultOrderLine({
                title: orderData.packageName,
                checkinItems: true,
                purchaseOrderId: order.id,
                specialLocationId: testData.location.id,
                specialMaterialTypeId: testData.materialTypeId,
                acquisitionMethod: testData.acquisitionMethodId,
              }),
              isPackage: true,
            }).then((orderLine) => {
              orderData.orderLine = orderLine;
            });
          });
        });
      });
      // Order #1: Open, then cancel. Order #2 stays Pending
      cy.then(() => {
        Orders.updateOrderViaApi({
          ...testData.cancelledOrder.order,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
        Orders.updateOrderViaApi({
          ...testData.cancelledOrder.order,
          workflowStatus: ORDER_STATUSES.CLOSED,
          closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
        });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiReceivingCreate,
            CapabilitySets.uiOrdersOrdersView,
            CapabilitySets.uiInventoryInstanceView,
          ],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.verifyPageDisplayed,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      [testData.cancelledOrder, testData.pendingOrder].forEach(({ order, orderLine }) => {
        Receiving.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
          Orders.deleteOrderViaApi(order.id);
          if (title?.instanceId) {
            InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(title.instanceId);
          }
        });
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C468239 ECS | Newly created title without added pieces appears in "Package titles" for closed and pending ongoing "Package" orders in Central tenant (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C468239'] },
      () => {
        const cancelledPolNumber = testData.cancelledOrder.orderLine.poLineNumber;
        const pendingPolNumber = testData.pendingOrder.orderLine.poLineNumber;

        // Step 1: Click "Actions" button and select "New" option
        Receiving.clickNewTitleOption();
        Receiving.verifyNewTitlePageOpened();
        ReceivingEditForm.verifyTitleFieldEnabled(false);

        // Step 2: Click on "POL number look-up" link
        Receiving.clickPOLNumberLookUpButton();
        SelectOrderLinesModal.verifyModalView({ multiselect: false });

        // Step 3: Search for PO line from Order #1 and select it
        SelectOrderLinesModal.searchByName(cancelledPolNumber);
        SelectOrderLinesModal.selectOrderLineByNumber(cancelledPolNumber, { multiselect: false });
        ReceivingEditForm.checkReceivingFormContent({
          lineDetails: { poLineNumber: cancelledPolNumber },
        });
        ReceivingEditForm.verifyTitleFieldEnabled(true);

        // Step 4: Enter title name in "Title" field (not using "Title look-up")
        ReceivingEditForm.fillItemDetailsFields({ title: testData.cancelledOrder.titleName });

        // Step 5: Click "Save & close"
        Receiving.clickSaveAndCloseInNewTitle(
          testData.cancelledOrder.titleName,
          cancelledPolNumber,
        );
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.cancelledOrder.titleName);
        Receiving.checkPurchaseOrderClosedWarning({
          reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
        });

        // Step 6: Click on the PO line number hyperlink
        Receiving.clickOnPOLnumber(cancelledPolNumber);
        OrderLineDetails.waitLoading();
        OrderLines.verifyPackageTitlesAccordionExists();
        OrderLineDetails.checkPurchaseOrderClosedWarning({
          reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
        });

        // Step 7: Expand "Package titles" accordion
        OrderLines.expandPackageTitles();
        OrderLines.verifyPackageTitlesCount(1);
        OrderLines.verifyPackageTitleExists(testData.cancelledOrder.titleName);

        // Step 8: Click on the link in "Title" column
        OrderLines.selectInstanceInPackageTitles(testData.cancelledOrder.titleName);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.checkInstanceTitle(testData.cancelledOrder.titleName);
        InventoryInstance.verifyHoldingsAccordionsCount(0);

        // Step 9: Navigate back to "Receiving" app, click "Actions" -> "New"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receiving.verifyPageDisplayed();
        Receiving.clickNewTitleOption();
        Receiving.verifyNewTitlePageOpened();
        ReceivingEditForm.verifyTitleFieldEnabled(false);

        // Step 10: Click on "POL number look-up" link
        Receiving.clickPOLNumberLookUpButton();
        SelectOrderLinesModal.verifyModalView({ multiselect: false });

        // Step 11: Search for PO line from Order #2 and select it
        SelectOrderLinesModal.searchByName(pendingPolNumber);
        SelectOrderLinesModal.selectOrderLineByNumber(pendingPolNumber, { multiselect: false });
        ReceivingEditForm.checkReceivingFormContent({
          lineDetails: { poLineNumber: pendingPolNumber },
        });
        ReceivingEditForm.verifyTitleFieldEnabled(true);

        // Step 12: Enter title name in "Title" field (not using "Title look-up")
        ReceivingEditForm.fillItemDetailsFields({ title: testData.pendingOrder.titleName });

        // Step 13: Click "Save & close"
        Receiving.clickSaveAndCloseInNewTitle(testData.pendingOrder.titleName, pendingPolNumber);
        ReceivingDetails.checkTitlePaneIsDisplayed(testData.pendingOrder.titleName);

        // Step 14: Click on the PO line number hyperlink
        Receiving.clickOnPOLnumber(pendingPolNumber);
        OrderLineDetails.waitLoading();
        OrderLines.verifyPackageTitlesAccordionExists();

        // Step 15: Expand "Package titles" accordion
        OrderLines.expandPackageTitles();
        OrderLines.verifyPackageTitlesCount(1);
        OrderLines.verifyPackageTitleExists(testData.pendingOrder.titleName);

        // Step 16: Click on the link in "Title" column
        OrderLines.selectInstanceInPackageTitles(testData.pendingOrder.titleName);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.checkInstanceTitle(testData.pendingOrder.titleName);
        InventoryInstance.verifyHoldingsAccordionsCount(0);
      },
    );
  });
});
