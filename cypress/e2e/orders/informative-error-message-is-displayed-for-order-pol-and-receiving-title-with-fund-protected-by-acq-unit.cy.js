import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingEditForm from '../../support/fragments/receiving/receivingEditForm';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  // expected - shown on the title when the order type could not be resolved because the fund is protected
  const UNDEFINED_ORDER_TYPE = 'ui-receiving.title.orderType.undefined';
  const UNAVAILABLE_FUND_NAME = 'Unavailable fund name';
  const testData = {};

  before('Create test data', () => {
    testData.instanceTitle = `AT_C986314_FolioInstance_${getRandomPostfix()}`;
    testData.packageTitle = `AT_C986314_Package_${getRandomPostfix()}`;
    testData.edition = `AT_C986314_Edition_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C986314_Organization_${getRandomPostfix()}`,
    };
    testData.acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      name: `AT_C986314_AcquisitionUnit_${getRandomPostfix()}`,
      protectRead: true,
      protectUpdate: true,
      protectCreate: true,
      protectDelete: true,
    });
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C986314_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C986314_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
      acqUnitIds: [testData.acquisitionUnit.id],
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      name: `AT_C986314_Budget_${getRandomPostfix()}`,
      fundId: testData.fund.id,
      allocated: 100,
    };
    testData.fundDistribution = [
      {
        code: testData.fund.code,
        fundId: testData.fund.id,
        distributionType: 'percentage',
        value: 100,
      },
    ];

    cy.clearLocalStorage();
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
    // Admin user is included in the acquisition unit to create and use the protected fund
    cy.getAdminUserDetails().then((admin) => {
      AcquisitionUnits.assignUserViaApi(admin.id, testData.acquisitionUnit.id).then(
        (membershipId) => {
          testData.adminMembershipId = membershipId;
        },
      );
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
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
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      // Order #1
      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
        reEncumber: true,
      }).then((order) => {
        testData.firstOrder = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            listUnitPrice: 10,
            fundDistribution: testData.fundDistribution,
          }),
        ).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.firstOrderLine = openedOrderLine;
          });
        });
      });

      // Order #2 with "Package" PO line
      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
        reEncumber: true,
      }).then((order) => {
        testData.secondOrder = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.packageTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            checkinItems: true,
            listUnitPrice: 10,
            fundDistribution: testData.fundDistribution,
          }),
          isPackage: true,
        }).then((orderLine) => {
          testData.secondOrderLine = orderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // User is NOT a member of the acquisition unit
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.firstOrder.poNumber);
      Orders.checkSearchResults(testData.firstOrder.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.firstOrderLine.instanceId,
    );
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
  });

  it(
    'C986314 Informative error message is displayed when a user views and edits an order, PO line and Receiving title associated with a fund distribution protected by acquisition unit (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C986314'] },
    () => {
      // Step 1: Click on Order number from precondition
      Orders.selectFromResultsList(testData.firstOrder.poNumber);
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      OrderDetails.checkOrderDetails({
        fieldsNotDisplayed: [
          ORDER_VIEW_FIELD_LABELS.PO_NUMBER,
          ORDER_VIEW_FIELD_LABELS.VENDOR,
          ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS,
        ],
      });

      // Step 2: Select "Order lines" toggle, search for the PO line from Preconditions and click on it
      Orders.selectOrderLines();
      OrderLines.selectOrderLineByPolNumber(testData.firstOrderLine.poLineNumber);
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: UNAVAILABLE_FUND_NAME }]);

      // Step 3: Click "Actions" button, select "Edit" option
      OrderLines.editPOLInOrder();
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      OrderLineEditForm.verifyBlankFormDisplayed();
      InteractorsTools.closeAllVisibleCallouts();

      // Step 4: Close "Edit" POL page, click "Actions" button, select "Receive" option, click on the Title name
      OrderLineEditForm.closeBlankForm();
      cy.wait(3000);
      InteractorsTools.closeAllVisibleCallouts();
      OrderLines.receiveOrderLineViaActions();
      Receiving.waitLoading();
      Receiving.selectFromResultsList(testData.instanceTitle);
      cy.wait(1000);
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [
          { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: UNDEFINED_ORDER_TYPE },
        ],
      });

      // Step 5: Click "Actions" button, select "Edit" option
      ReceivingDetails.openReceivingEditForm();

      // Step 6: Edit any field in the "Item information" accordion, click "Save & close" button
      ReceivingEditForm.fillItemDetailsFields({ edition: testData.edition });
      ReceivingEditForm.clickSaveButton();
      cy.wait(1000);
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.checkReceivingDetails({
        information: [{ key: 'Edition', value: testData.edition }],
      });

      // Step 7: Click on the piece record in the "Expected" accordion, select "Quick receive" option
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      Receiving.quickReceiveInEditPieceModal();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      cy.wait(1000);
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      InteractorsTools.closeAllVisibleCallouts();

      // Step 8: Click "Actions" button on the second "Receiving" pane, select "New" option
      Receiving.clickNewTitleOption();
      Receiving.verifyNewTitlePageOpened();

      // Step 9: Select the PO line from the order #2 via "POL number look-up" link, fill in "Title", click "Save & close"
      Receiving.fillPOLNumberLookup(testData.secondOrderLine.poLineNumber);
      Receiving.fillTitleLookup(testData.instanceTitle);
      cy.wait(3000);
      Receiving.clickSaveAndCloseInNewTitle(
        testData.instanceTitle,
        testData.secondOrderLine.poLineNumber,
      );
      InteractorsTools.checkCalloutErrorMessage(OrderStates.fundsCouldNotBeLoaded);
      InteractorsTools.closeAllVisibleCallouts();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [
          { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: UNDEFINED_ORDER_TYPE },
        ],
      });
    },
  );
});
