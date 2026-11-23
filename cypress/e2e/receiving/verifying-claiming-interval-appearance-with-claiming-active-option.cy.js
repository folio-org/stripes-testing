import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, ReceivingEditForm, Receivings } from '../../support/fragments/receiving';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    claimingIntervalInitial: '35',
    claimingIntervalUpdated: '20',
    organization: {
      ...NewOrganization.getDefaultOrganization({ claimingInterval: 35 }),
      name: `AT_C423486_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C423486_Title_${randomPostfix}`,
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: 1,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: false,
          claimingInterval: 35,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.updateOrderViaApi(
      { ...testData.order, workflowStatus: ORDER_STATUSES.PENDING },
      true,
      false,
    );
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423486 Verifying appearance of "Claiming interval" field with active and inactive "Claiming active" option in "Receiving" app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423486'] },
    () => {
      const titleSavedMessage = `The title ${testData.orderLineTitle} has been successfully added for PO line ${testData.orderLine.poLineNumber}`;

      // Step 1: Open Order details pane - verify Open status and one POL
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.verifyPOLCount(1);

      // Step 2: Navigate to Receiving via Actions → Receive
      OrderDetails.openReceivingsPage();
      Receivings.assertReceivingResults([testData.orderLineTitle]);

      // Step 3: Open the receiving record details pane - verify Expected accordion has one record
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyTitleInformationAccordionExpanded(false);

      // Step 4: Expand Title information - verify claiming active unchecked, interval = '35', Edit active
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationAccordionExpanded(true);
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: false,
        claimingInterval: testData.claimingIntervalInitial,
      });
      ReceivingDetails.verifyEditButtonState({ disabled: false });

      // Step 5: Click Edit - verify claiming active unchecked, interval inactive, save inactive, cancel active
      ReceivingDetails.openReceivingEditForm();
      ReceivingEditForm.checkItemDetailsFields({ claimingActive: false });
      ReceivingEditForm.verifyClaimingIntervalEnabled(false);
      ReceivingEditForm.verifySaveButtonEnabled(false);
      ReceivingEditForm.verifyCancelButtonEnabled(true);

      // Step 6: Claiming interval field is disabled, so clicking it does nothing
      ReceivingEditForm.verifyClaimingIntervalEnabled(false);

      // Step 7: Check "Claiming active" - interval becomes active, save button activates
      ReceivingEditForm.fillItemDetailsFields({ claimingActive: true });
      ReceivingEditForm.verifyClaimingIntervalEnabled(true);
      ReceivingEditForm.verifySaveButtonEnabled(true);

      // Step 8: Replace value in "Claiming interval" with '20'
      ReceivingEditForm.fillItemDetailsFields({
        claimingInterval: testData.claimingIntervalUpdated,
      });

      // Step 9: Save & close - toast appears, edit page closes
      ReceivingEditForm.clickSaveButton({ itemSaved: false });
      InteractorsTools.checkCalloutMessage(titleSavedMessage);

      // Step 10: Expand Title information - verify claiming active checked, interval = '20'
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationAccordionExpanded(true);
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: true,
        claimingInterval: testData.claimingIntervalUpdated,
      });

      // Step 11: Click Edit - verify claiming active checked, interval = '20', save inactive, cancel active
      ReceivingDetails.openReceivingEditForm();
      ReceivingEditForm.checkItemDetailsFields({
        claimingActive: true,
        claimingInterval: testData.claimingIntervalUpdated,
      });
      ReceivingEditForm.verifySaveButtonEnabled(false);
      ReceivingEditForm.verifyCancelButtonEnabled(true);

      // Step 12: Uncheck "Claiming active" - interval becomes empty and inactive, save button activates
      ReceivingEditForm.fillItemDetailsFields({ claimingActive: false });
      ReceivingEditForm.checkItemDetailsFields({ claimingInterval: '' });
      ReceivingEditForm.verifyClaimingIntervalEnabled(false);
      ReceivingEditForm.verifySaveButtonEnabled(true);

      // Step 13: Save & close - toast appears, edit page closes
      ReceivingEditForm.clickSaveButton({ itemSaved: false });
      InteractorsTools.checkCalloutMessage(titleSavedMessage);

      // Step 14: Expand Title information - verify claiming active unchecked, interval = '-'
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationAccordionExpanded(true);
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: false,
        claimingInterval: '-',
      });
    },
  );
});
