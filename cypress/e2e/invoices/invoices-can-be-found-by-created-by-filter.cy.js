import Permissions from '../../support/dictionary/permissions';
import { Budgets } from '../../support/fragments/finance';
import Invoices from '../../support/fragments/invoices/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const users = {};
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    firstInvoice: {},
    secondInvoice: {},
  };

  before('Created test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    const { fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.fund = fund;

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      users.firstUser = userProperties;

      cy.getUserToken(users.firstUser.username, users.firstUser.password).then(() => {
        Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          testData.firstInvoice = invoice;
        });
      });
    });
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersCreate.gui,
    ]).then((userProperties) => {
      users.secondUser = userProperties;

      cy.getUserToken(users.secondUser.username, users.secondUser.password).then(() => {
        Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          testData.secondInvoice = invoice;
        });

        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        };
        const orderLine = BasicOrderLine.getDefaultOrderLine({
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(order, orderLine)
          .then((orderWithLine) => {
            testData.order = orderWithLine;
          })
          .then(() => {
            OrderLines.getOrderLineViaApi({
              query: `poLineNumber=="*${testData.order.poNumber}*"`,
            }).then((orderLines) => {
              const invoiceLine = Invoices.getDefaultInvoiceLine({
                invoiceId: testData.firstInvoice.id,
                invoiceLineStatus: testData.firstInvoice.status,
                poLineId: orderLines[0].id,
                fundDistributions: orderLines[0].fundDistribution,
                accountingCode: testData.organization.erpCode,
              });
              Invoices.createInvoiceLineViaApi(invoiceLine);
            });
          });
      });

      cy.login(users.secondUser.username, users.secondUser.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(users.firstUser.userId);
    Users.deleteViaApi(users.secondUser.userId);
    Orders.deleteOrderViaApi(testData.order.id);
    Invoices.deleteInvoiceViaApi(testData.firstInvoice.id);
    Invoices.deleteInvoiceViaApi(testData.secondInvoice.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Budgets.getBudgetViaApi({ query: `fundId=${testData.fund.id}` }).then(({ budgets }) => {
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
        id: budgets[0].id,
        fundId: testData.fund.id,
        ledgerId: testData.fund.ledgerId,
        fiscalYearId: budgets[0].fiscalYearId,
      });
    });
  });

  it(
    'C466116 Invoices can be found by "Created by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466116'] },
    () => {
      Invoices.selectCreatedByFilter(users.firstUser.username);
      Invoices.verifySearchResult(testData.firstInvoice.vendorInvoiceNo);
      Invoices.resetFilters();
      Invoices.selectCreatedByFilter(users.secondUser.username);
      Invoices.verifySearchResult(testData.secondInvoice.vendorInvoiceNo);
      Invoices.selectCreatedByFilter(users.firstUser.username);
      Invoices.verifySearchResult(testData.firstInvoice.vendorInvoiceNo);
    },
  );
});
