import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CURRENCIES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const defaultCurrency = {
    code: 'USD',
    name: 'US Dollar',
    label: CURRENCIES.USD,
  };
  const unknownCurrencyCodes = ['UYW', 'UYI'];
  let testData;

  before('Create test data', () => {
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C440108_Organization_${getRandomPostfix()}`,
        isVendor: true,
      },
      order: {},
      location: {},
      user: {},
      polData: {
        itemDetails: {
          title: `AT_C440108_POLTitle_${getRandomPostfix()}`,
        },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          materialType: MATERIAL_TYPE_NAMES.TEXT,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      },
      invoice: {
        invoiceDate: DateTools.getFormattedDate({ date: new Date() }),
        batchGroupName: INVOICE_BATCH_GROUPS.FOLIO,
        vendorInvoiceNo: `AT_C440108_Invoice_${getRandomPostfix()}`,
        paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
        note: `AT_C440108_InvoiceNote_${getRandomPostfix()}`,
      },
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organizationId })).then(
        (orderResponse) => {
          testData.order = orderResponse;
        },
      );
    });

    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false }));
    });
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C440108 Default currency is selected in POL and Invoice when Organization-vendor has not specified "Vendor currencies" and unknown currencies are excluded from dropdown (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C440108'] },
    () => {
      // Step 1: Click "Actions" -> "Add PO line" in "PO lines" accordion
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 2: "Currency" dropdown in "Cost details" is prepopulated with system default currency
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: defaultCurrency.label } },
      ]);

      // Step 3: Fill in the mandatory fields on "Add PO line" page
      OrderLineEditForm.fillOrderLineFields(testData.polData);
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        physicalQuantity: '1',
      });

      // Step 4: Click "Save & close" - PO line is created with default currency
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [{ key: POLINE_DETAILS_FIELDS.CURRENCY, value: defaultCurrency.code }],
      });

      // Step 5: Navigate to "Invoices" app, click "Actions" -> "New"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.openInvoiceEditForm({ createNew: true });

      // Step 6: Fill in the mandatory fields ("Status" is left as "Open")
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
      });

      // Step 7: Default currency is displayed in "Currency" dropdown
      InvoiceEditForm.checkCurrency(defaultCurrency.label);

      // Step 8: Unknown currencies are not present in "Currency" dropdown
      InvoiceEditForm.checkCurrencyOptions(unknownCurrencyCodes, { isPresent: false });

      // Step 9: Click "Save & close" - invoice is saved with default currency
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: false });
      InvoiceView.waitLoading();
      InvoiceView.verifyCurrency(defaultCurrency.name);

      // Step 10: Click "Actions" -> "Edit", unknown currencies are not present in "Currency" dropdown
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkCurrencyOptions(unknownCurrencyCodes, { isPresent: false });

      // Step 11: Make any change and click "Save & close"
      InvoiceEditForm.fillInvoiceFields({ note: testData.invoice.note });
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: false });
      InvoiceView.waitLoading();
      InvoiceView.verifyInvoiceNote(testData.invoice.note);
    },
  );
});
