import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.acqUnit = {
      ...AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
      name: `AT_C451627_AcqUnit_${postfix}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C451627_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C451627_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C451627_Organization_${postfix}`,
    };

    cy.getAdminToken();
    // Acquisition unit with all checkboxes checked, admin is assigned to delete the protected invoice in cleanup
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then((acqUnit) => {
      testData.acqUnit = acqUnit;

      cy.getAdminUserDetails().then((adminUser) => {
        AcquisitionUnits.assignUserViaApi(adminUser.id, acqUnit.id).then((membershipId) => {
          testData.adminMembershipId = membershipId;
        });
      });
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
      }).then((budget) => {
        testData.budget = budget;
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // Open order with one PO line, fund distribution is specified with the fund
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            listUnitPrice: 10,
            poLineEstimatedPrice: 10,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        ).then((orderLine) => {
          testData.orderLine = orderLine;
        });
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInvoiceInvoicesAcquisitionsUnitsManage,
          CapabilitySets.uiInvoiceInvoiceCreate,
          CapabilitySets.uiOrdersOrdersEdit,
          CapabilitySets.acquisitionUnitsSettingsUserAssignmentManage,
          CapabilitySets.uiInvoiceInvoicesAcquisitionsUnitsAssign,
        ],
      );
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acqUnit.id).then(
        (membershipId) => {
          testData.userMembershipId = membershipId;
        },
      );
    });

    // Invoice based on the order with acquisition unit assigned (created by test user)
    cy.then(() => {
      cy.getUserToken(testData.user.username, testData.user.password);
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        expect(orderLine.fundDistribution[0].encumbrance, 'PO line encumbrance').to.be.a('string');
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
          poLineId: orderLine.id,
          invoiceStatus: INVOICE_STATUSES.OPEN,
          fundDistributions: orderLine.fundDistribution,
          subTotal: 10,
          releaseEncumbrance: true,
          exportToAccounting: false,
          acqUnitIds: [testData.acqUnit.id],
        }).then((invoice) => {
          testData.invoice = invoice;
        });
      });
    });

    // Test user is deleted from the acquisition unit
    cy.then(() => {
      cy.getAdminToken();
      AcquisitionUnits.unAssignUserViaApi(testData.userMembershipId);
    });

    // Fund is deleted from "Fund distribution" in PO line (by test user)
    cy.then(() => {
      cy.getUserToken(testData.user.username, testData.user.password);
      OrderLines.getOrderLineByIdViaApi(testData.orderLine.id).then((orderLine) => {
        OrderLines.updateOrderLineViaApi({ ...orderLine, fundDistribution: [] });
      });
    });

    // Test user is added back to the acquisition unit
    cy.then(() => {
      cy.getAdminToken();
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acqUnit.id).then(
        (membershipId) => {
          testData.userMembershipId = membershipId;
        },
      );
    });

    cy.then(() => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id, false);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    AcquisitionUnits.unAssignUserViaApi(testData.userMembershipId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id, false);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C451627 Link to encumbrance is removed from Invoice with Acq unit when Fund distribution is deleted from related POL (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C451627'] },
    () => {
      // Step 1: Open DevTools ("Network" tab)
      cy.intercept('GET', '**/invoice/invoice-lines/*').as('getInvoiceLine');

      // Step 2: Click on the invoice line record in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '-' },
      ]);
      cy.wait('@getInvoiceLine').then(({ response }) => {
        expect(response.body.fundDistributions).to.have.lengthOf(1);
        expect(response.body.fundDistributions[0].encumbrance).to.be.oneOf([undefined, null]);
      });
    },
  );
});
