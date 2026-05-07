import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import { DateTools } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { InvoiceEditForm, InvoiceLineDetails, Invoices } from '../../support/fragments/invoices';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_AND_INVOICE_LINE_BUTTONS,
  INVOICE_BATCH_GROUPS,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_VIEW_FIELDS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    order: {},
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumberFirst: `autotest_first${getRandomPostfix()}`,
      vendorInvoiceNumberSecond: `autotest_second_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
      id: null,
    },
    invoiceLine: {
      descriptionFirst: `autotest_first_description_${getRandomPostfix()}`,
      descriptionSecond: `autotest_second_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '10',
    },
    user: {},
  };

  const buttonConditions = {
    saveCloseEnabled: [
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.CANCEL, conditions: { disabled: false } },
      {
        label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_KEEP_EDITING,
        conditions: { disabled: false },
      },
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_CLOSE, conditions: { disabled: false } },
    ],
    saveCloseDisabled: [
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.CANCEL, conditions: { disabled: false } },
      {
        label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_KEEP_EDITING,
        conditions: { disabled: true },
      },
      { label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_CLOSE, conditions: { disabled: true } },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
      }).then((acquisitionMethod) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
        };

        Orders.createOrderViaApi(order).then((orderResponse) => {
          testData.order = orderResponse;

          const orderLine = {
            ...BasicOrderLine.defaultOrderLine,
            purchaseOrderId: orderResponse.id,
            cost: {
              listUnitPrice: 10,
              currency: 'USD',
              quantityPhysical: 1,
              poLineEstimatedPrice: 10,
            },
            locations: [],
            acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
              materialSupplier: organizationId,
            },
          };

          OrderLines.createOrderLineViaApi(orderLine).then(() => {
            Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    if (testData.invoice.id) {
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
    }
  });

  it(
    'C663268 Save using "Save & keep editing" button when creating new invoice and invoice line (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C663268'] },
    () => {
      // Step 1: Check the initial state of the buttons on invoice edit form
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 2: Check buttons state after filling one field
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
      });
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 2: Check buttons state after filling one field
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
      });
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 3: Check Required fields after clicking "Save & keep editing" button
      InvoiceEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      InvoiceEditForm.checkRequiredFields([
        INVOICE_VIEW_FIELDS.BATCH_GROUP,
        INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER,
        INVOICE_VIEW_FIELDS.VENDOR_NAME,
        INVOICE_VIEW_FIELDS.PAYMENT_METHOD,
      ]);

      // Step 4: Check buttons state after filling all required fields and clicking "Save & keep editing" button
      InvoiceEditForm.fillInvoiceFields({
        batchGroupName: testData.invoice.batchGroup,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberFirst,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.clickSaveAndKeepEditingButton();
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 5: Check buttons state after making changes
      InvoiceEditForm.fillInvoiceFields({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberSecond,
      });
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 6: Check buttons state after clicking "Save & keep editing" button
      InvoiceEditForm.clickSaveAndKeepEditingButton();
      InvoiceEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 7: Make changes and Close without saving, check that changes are not saved, save invoice id for clean up
      InvoiceEditForm.fillInvoiceFields({
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumberFirst,
      });
      InvoiceEditForm.cancelWithUnsavedChanges({ shouldShowInvoiceDetails: true });
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumberSecond,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.BATCH_GROUP, value: testData.invoice.batchGroup },
        ],
      });
      cy.url().then((url) => {
        testData.invoice.id = url.match(/invoice\/view\/([^/]+)/)?.[1] || null;
      });

      // Step 8: Check the initial state of the buttons on invoice line edit form
      InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 9: Check buttons state after filling one field
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLine.descriptionFirst,
      });
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 10: Check Required fields after clicking "Save & keep editing" button
      InvoiceLineEditForm.clickSaveAndKeepEditingButton({ isSaved: false });
      InvoiceLineEditForm.checkRequiredFields([
        INVOICE_LINE_VIEW_FIELDS.QUANTITY,
        INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL,
      ]);

      // Step 11: Check buttons state after filling all required fields and clicking "Save & keep editing" button
      InvoiceLineEditForm.fillInvoiceLineFields({
        quantity: testData.invoiceLine.quantity,
        subTotal: testData.invoiceLine.subTotal,
      });
      InvoiceLineEditForm.clickSaveAndKeepEditingButton();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 12: Check buttons state after making changes
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLine.descriptionSecond,
      });
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseEnabled);

      // Step 13: Check buttons state after clicking "Save & keep editing" button
      InvoiceLineEditForm.clickSaveAndKeepEditingButton();
      InvoiceLineEditForm.checkButtonsConditions(buttonConditions.saveCloseDisabled);

      // Step 14: Make changes and Close without saving, check that changes are not saved
      InvoiceLineEditForm.fillInvoiceLineFields({
        description: testData.invoiceLine.descriptionFirst,
      });
      InvoiceLineEditForm.cancelWithUnsavedChanges();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumberSecond,
        invoiceLine: [
          {
            key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
            value: testData.invoiceLine.descriptionSecond,
          },
        ],
      });

      // Step 15 Check created invoice line
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          {
            key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
            value: testData.invoiceLine.descriptionSecond,
          },
          {
            key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL,
            value: `$${testData.invoiceLine.subTotal}.00`,
          },
          { key: INVOICE_LINE_VIEW_FIELDS.QUANTITY, value: testData.invoiceLine.quantity },
        ],
      });

      // Step 16: Create invoice from Order and check buttons presence and state on invoice edit form
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.waitLoading();
      OrderDetails.createNewInvoice();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.checkButtonsConditions([
        { label: INVOICE_AND_INVOICE_LINE_BUTTONS.CANCEL, conditions: { disabled: false } },
        { label: INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);
      InvoiceEditForm.checkButtonsNotDisplayed([
        INVOICE_AND_INVOICE_LINE_BUTTONS.SAVE_AND_KEEP_EDITING,
      ]);

      // Step 17: Cancel invoice creation
      InvoiceEditForm.cancelWithUnsavedChanges();
      OrderDetails.waitLoading();
    },
  );
});
