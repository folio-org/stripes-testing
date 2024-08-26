import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
// import { Invoices } from '../../support/fragments/invoices';
// NewInvoice, NewInvoiceLine, VendorAddress
import { Organizations, NewOrganization } from '../../support/fragments/organizations';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import TopMenu from '../../support/fragments/topMenu';
// import Users from '../../support/fragments/users/users';
import { Approvals } from '../../support/fragments/settings/invoices';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { ORDER_STATUSES } from '../../support/constants';
import orderDetails from '../../support/fragments/orders/orderDetails';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const fiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 10000,
  };
  const isApprovePayEnabled = true;
  const testData = {
    organization,
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    user: {},
  };
  const setApprovePayValue = (isEnabled = false) => {
    cy.getAdminToken().then(() => {
      Approvals.setApprovePayValue(isEnabled);
    });
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit);
    Organizations.createOrganizationViaApi(organization).then((responseFirstOrganization) => {
      testData.organization.id = responseFirstOrganization;
      FiscalYears.createViaApi(fiscalYear).then((firstFiscalYearResponse) => {
        fiscalYear.id = firstFiscalYearResponse.id;
        budget.fiscalYearId = firstFiscalYearResponse.id;
        ledger.fiscalYearOneId = fiscalYear.id;
        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          fund.ledgerId = ledger.id;

          Funds.createViaApi(fund).then((fundResponse) => {
            fund.id = fundResponse.fund.id;
            budget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(budget).then(() => {
              const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
              const orderLine = BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: testData.acqUnit.id,
                automaticExport: true,
                purchaseOrderId: order.id,
                vendorDetail: { vendorAccount: null },
                fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
              });
              Orders.createOrderWithOrderLineViaApi(order, orderLine).then((respOrder) => {
                testData.order = respOrder;

                Orders.updateOrderViaApi({
                  ...testData.order,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
      Permissions.uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      AcquisitionUnits.assigneAcquisitionUnitUsersViaApi(
        userProperties.userId,
        testData.acqUnit.id,
      );
      // AcquisitionUnits.assigneAcquisitionUnitUsersViaApi(userProperties.userId, testData.acqUnit.id);

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      setApprovePayValue(isApprovePayEnabled);
    });
  });

  // after(() => {
  //   cy.getAdminToken();
  //   Users.deleteViaApi(user.userId);
  // });

  it(
    'C446069 Pay invoice related to order with acquisition unit (user is not included into such unit) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      orderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
