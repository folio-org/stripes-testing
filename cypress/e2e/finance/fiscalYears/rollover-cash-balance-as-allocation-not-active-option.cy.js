import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const secondFiscalYear = {
      name: `autotest_year_${getRandomPostfix()}`,
      code: DateTools.getRandomFiscalYearCode(2000, 9999),
      periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
      series: 'FY',
    };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const secondOrder = {
      ...NewOrder.getDefaultOngoingOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const firstOrder = {
      id: uuid(),
      vendor: '',
      orderType: 'One-Time',
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const firstBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const todayDate = DateTools.getCurrentDate();
    const fileNameDate = DateTools.getCurrentDateForFileNaming();
    let user;
    let location;
    let firstInvoice;

    before(() => {
      cy.getAdminToken();
      // create first Fiscal Year and prepere 2 Funds for Rollover
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        firstBudget.fiscalYearId = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            firstBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(firstBudget);

            // Create second Fiscal Year for Rollover
            FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
              secondFiscalYear.id = secondFiscalYearResponse.id;
            });

            cy.getLocations({ limit: 1 }).then((res) => {
              location = res;

              cy.getDefaultMaterialType().then((mtype) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  // Prepare 2 Open Orders for Rollover
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      secondOrder.vendor = organization.id;
                      firstOrder.vendor = organization.id;
                      const firstOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 40.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 40.0,
                        },
                        fundDistribution: [
                          { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                        ],
                        locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtype.id,
                          materialSupplier: responseOrganizations,
                          volumes: [],
                        },
                      };
                      const secondOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        id: uuid(),
                        cost: {
                          listUnitPrice: 10.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 10.0,
                        },
                        fundDistribution: [
                          { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                        ],
                        locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtype.id,
                          materialSupplier: responseOrganizations,
                          volumes: [],
                        },
                      };
                      Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                        firstOrder.id = firstOrderResponse.id;
                        firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                        OrderLines.createOrderLineViaApi(firstOrderLine);
                        Orders.updateOrderViaApi({
                          ...firstOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: firstFiscalYear.id,
                          poLineId: firstOrderLine.id,
                          fundDistributions: firstOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 40,
                        }).then((invoiceRescponse) => {
                          firstInvoice = invoiceRescponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });
                        });
                      });
                      Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                        secondOrder.id = secondOrderResponse.id;
                        secondOrderLine.purchaseOrderId = secondOrderResponse.id;

                        OrderLines.createOrderLineViaApi(secondOrderLine);
                        Orders.updateOrderViaApi({
                          ...secondOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });
                    },
                  );
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        permissions.uiFinanceExecuteFiscalYearRollover.gui,
        permissions.uiFinanceViewFiscalYear.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiFinanceViewLedger.gui,
        permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C376608 Rollover cash balance as allocation ("Allocation" option is NOT active) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C376608'] },
      () => {
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInTestRolloverInfoCashBalanceWithNotActiveAllocation(
          secondFiscalYear.code,
          'Cash balance',
          'Allocation',
        );
        Ledgers.rolloverLogs();
        Ledgers.checkRolloverLogs(todayDate);
        Ledgers.exportRollover(todayDate);
        Ledgers.checkDownloadedFile(
          `${fileNameDate}-result.csv`,
          defaultFund,
          secondFiscalYear,
          '100',
          '100',
          '60',
          '60',
          '60',
          '60',
          '60',
        );
        Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
        Ledgers.closeOpenedPage();
        Ledgers.rollover();
        Ledgers.fillInRolloverForCashBalanceWithNotActiveAllocation(
          secondFiscalYear.code,
          'Cash balance',
          'Allocation',
        );
        Ledgers.closeRolloverInfo();
        Ledgers.selectFundInLedger(defaultFund.name);
        Funds.selectPlannedBudgetDetails();
        Funds.checkFundingInformation('$60.00', '$0.00', '$0.00', '$60.00', '$0.00', '$60.00');
        Funds.checkFinancialActivityAndOverages('$0.00', '$0.00', '$0.00', '$0.00', '$0.00');
      },
    );
  });
});
