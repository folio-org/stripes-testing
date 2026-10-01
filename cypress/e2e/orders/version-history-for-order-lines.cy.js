import {
  ORDER_LINE_ACCORDION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POLINE_FUND_DISTRIBUTION_COLUMNS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import AgreementLines from '../../support/fragments/agreements/agreementLines';
import Agreements from '../../support/fragments/agreements/agreements';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';
import Invoices from '../../support/fragments/invoices/invoices';
import Notes from '../../support/fragments/notes/notes';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDateTime } from '../../support/utils/acquisitions';
import getRandomPostfix from '../../support/utils/stringTools';
import { getFullName } from '../../support/utils/users';

describe('Orders', () => {
  const entityType = 'order-line';
  // versions created in preconditions, from most recent to least recent:
  // "Physical unit price" edit, opening the order, original version
  const versionsCount = 3;
  const originalVersionIndex = versionsCount - 1;
  // all fields listed as "Changed" on the card, the same fields are highlighted in version view
  const updatedUnitPrice = 20;
  // changed values are highlighted in version view: new "Physical unit price" and "Estimated price"
  const unitPriceEditHighlightedValues = [`$${updatedUnitPrice}.00`];
  const unitPriceEditChangedFields = [
    POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
    POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
  ];
  // changed values are highlighted in version view: new "Payment status" and "Receipt status"
  const orderOpeningHighlightedValues = [
    ORDER_LINE_PAYMENT_STATUS.AWAITING_PAYMENT,
    RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
  ];
  const orderOpeningChangedFields = [
    POLINE_DETAILS_FIELDS.PAYMENT_STATUS,
    POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
  ];
  const testData = {};

  const checkVersionHistoryCards = () => {
    const expectedCards = [
      { isCurrent: true, changedFields: unitPriceEditChangedFields },
      { changedFields: orderOpeningChangedFields },
      { isOriginal: true },
    ];

    AcqVersionHistory.verifyVersionsCount(entityType, versionsCount);
    expectedCards.forEach((card, index) => {
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        ...card,
        index,
        eventDate: testData.eventDates[index],
        source: testData.adminName,
      });
    });
  };

  before('Create test data', () => {
    testData.title = `AT_C369047_POLTitle_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C369047_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C369047_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C369047_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 1000,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    cy.getAdminUserDetails().then((adminUser) => {
      testData.adminName = getFullName(adminUser);
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      [testData.materialType] = mtypes;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // instance is linked to PO line from the start (as selected via "Title look-up"), so "Title" is a link in every version
    cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: { instanceTypeId: instanceTypes[0].id, title: testData.title },
      }).then(({ instanceId }) => {
        testData.instanceId = instanceId;
      });
    });

    // Precondition 1: order with PO line, opened afterwards, PO line is edited
    cy.then(() => {
      testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
      Orders.createOrderWithOrderLineViaApi(
        testData.order,
        BasicOrderLine.getDefaultOrderLine({
          title: testData.title,
          instanceId: testData.instanceId,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
          listUnitPrice: 10,
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        }),
      );
    });
    cy.get('@orderLine').then((orderLine) => {
      testData.orderLine = orderLine;

      Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
        testData.order = order;
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });
    cy.then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id)).then((orderLine) => {
      OrderLines.updateOrderLineViaApi({
        ...orderLine,
        cost: { ...orderLine.cost, listUnitPrice: updatedUnitPrice },
      });
    });

    // Precondition 2: related agreement, invoice line and note for the PO line
    cy.then(() => {
      Agreements.createViaApi({
        ...Agreements.defaultAgreement,
        name: `AT_C369047_Agreement_${getRandomPostfix()}`,
      }).then((agreement) => {
        testData.agreement = agreement;

        AgreementLines.createViaApi({
          ...AgreementLines.defaultAgreementLine(agreement.id),
          poLines: [{ poLineId: testData.orderLine.id }],
        }).then((agreementLine) => {
          testData.agreementLine = agreementLine;
        });
      });
      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.orderLine.id,
        fundDistributions: testData.orderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 20,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
      NoteTypes.getNoteTypesViaApi().then(([noteType]) => {
        Notes.createViaApi({
          domain: 'orders',
          typeId: noteType.id,
          title: `AT_C369047_Note_${getRandomPostfix()}`,
          content: 'AT_C369047 note details',
          links: [{ type: 'poLine', id: testData.orderLine.id }],
        }).then((note) => {
          testData.note = note;
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersView.gui, Permissions.uiNotesItemView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Users.deleteViaApi(testData.user.userId);
    Notes.deleteViaApi(testData.note.id, true);
    AgreementLines.deleteViaApi({
      agreementId: testData.agreement.id,
      agreementLineId: testData.agreementLine.id,
    });
    Agreements.deleteViaApi(testData.agreement.id);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.title);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C369047 "Version history" viewing for Order line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C369047'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/order-line/${testData.orderLine.id}*`).as(
        'versionHistory',
      );

      // Step 1: Click on the Order - "Purchase order" pane is displayed
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Click on edited Order line - "PO Line details" pane is displayed
      OrderDetails.openPolDetails(testData.title);

      // Step 3: Hover over "Version history" icon - tooltip is displayed
      OrderLineDetails.checkVersionHistoryButtonTooltip();

      // Step 4: Click "Version history" icon - versions are displayed from most recent to least recent
      OrderLineDetails.openVersionHistory();
      // only event timestamps are taken from the response, cards content is checked against the edits made in preconditions
      cy.wait('@versionHistory').then(({ response }) => {
        const formatEventDate = ({ eventDate }) => formatDateTime(testData.locale, eventDate);

        testData.eventDates = response.body.orderLineAuditEvents.map(formatEventDate);
      });
      cy.then(() => {
        checkVersionHistoryCards();
        OrderLineDetails.checkHighlightedFieldsInVersionHistoryView(unitPriceEditHighlightedValues);
        OrderLineDetails.checkFieldsInVersionHistoryView([
          {
            key: POLINE_DETAILS_FIELDS.CREATED_ON,
            value: testData.eventDates[originalVersionIndex],
          },
        ]);

        // Step 5: Click "View this version" icon on the last card - original version is displayed
        AcqVersionHistory.selectVersionHistoryCard(entityType, { index: originalVersionIndex });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, {
          index: originalVersionIndex,
        });
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: originalVersionIndex,
          isOriginal: true,
          source: testData.adminName,
        });
        OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([]);
        OrderLineDetails.checkFieldsInVersionHistoryView([
          {
            key: POLINE_DETAILS_FIELDS.CREATED_ON,
            value: testData.eventDates[originalVersionIndex],
          },
        ]);

        // Step 6: Verify "PO Line details" pane details in version view
        OrderLineDetails.checkTitleIsLink(testData.title, { isVersionView: true });
        OrderLineDetails.checkFundDistributionTable({
          rows: [{ [POLINE_FUND_DISTRIBUTION_COLUMNS.FUND]: testData.fund.name }],
          absentColumns: [
            POLINE_FUND_DISTRIBUTION_COLUMNS.INITIAL_ENCUMBRANCE,
            POLINE_FUND_DISTRIBUTION_COLUMNS.CURRENT_ENCUMBRANCE,
          ],
        });
        [
          ORDER_LINE_ACCORDION_NAMES.RELATED_AGREEMENTS,
          ORDER_LINE_ACCORDION_NAMES.RELATED_INVOICE_LINES,
          ORDER_LINE_ACCORDION_NAMES.NOTES,
        ].forEach((accordion) => OrderDetails.verifyAccordionExists(accordion, false));

        // Step 7: Click title link on the first card - current version is displayed
        AcqVersionHistory.clickVersionHistoryCardTitle(entityType, { index: 0 });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 0 });
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: 0,
          isCurrent: true,
          source: testData.adminName,
          changedFields: unitPriceEditChangedFields,
        });
        OrderLineDetails.checkHighlightedFieldsInVersionHistoryView(unitPriceEditHighlightedValues);

        // Step 8: Click "View this version" icon on a card except the first and the last
        AcqVersionHistory.selectVersionHistoryCard(entityType, { index: 1 });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 1 });
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: 1,
          source: testData.adminName,
          changedFields: orderOpeningChangedFields,
        });
        OrderLineDetails.checkHighlightedFieldsInVersionHistoryView(orderOpeningHighlightedValues);
      });

      // Step 9: Click back arrow on "PO Line details" pane - "Purchase order" pane is displayed
      OrderLineDetails.backToOrderDetails();
      VersionHistorySection.checkPaneShown(false);
      OrderLineDetails.checkPOLinePaneAbsent();
      OrderDetails.waitLoading();
    },
  );
});
