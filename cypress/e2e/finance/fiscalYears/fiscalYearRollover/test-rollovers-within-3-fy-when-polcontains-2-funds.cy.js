import uuid from 'uuid';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import Invoices from '../../../../support/fragments/invoices/invoices';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import LedgerRollovers from '../../../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Orders from '../../../../support/fragments/orders/orders';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Organizations from '../../../../support/fragments/organizations/organizations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_POL_PAYMENT_STATUSES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../../support/constants';
import { CodeTools, StringTools } from '../../../../support/utils';
import DateTools from '../../../../support/utils/dateTools';

describe('Fiscal Year Rollover', () => {
  const code = CodeTools(4);

  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
      third: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}03`,
        ...DateTools.getFullFiscalYearStartAndEnd(2),
      },
    },
    ledgers: {
      first: {},
      second: {},
    },
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
    },
    orders: {
      third: {},
    },
    orderLines: {
      third: {},
    },
    invoice: {},
    organization: {},
    acquisitionMethodId: null,
    batchGroupId: null,
    user: {},
    location: {},
    todayDate: DateTools.getCurrentDate(),
    fileNameDate: DateTools.getCurrentDateForFileNaming(),
  };

  const createFiscalYear = (fiscalYearKey) => {
    return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then(
      (fiscalYearResponse) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYearResponse;
      },
    );
  };

  const createFiscalYearsData = () => {
    return createFiscalYear('first')
      .then(() => createFiscalYear('second'))
      .then(() => createFiscalYear('third'));
  };

  const createLedgerViaApi = (ledgerKey) => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: testData.fiscalYears.first.id,
    }).then((ledgerResponse) => {
      testData.ledgers[ledgerKey] = ledgerResponse;
    });
  };

  const createFundWithBudget = ({ ledgerId, fiscalYearId }) => {
    return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId }).then((fundResponse) => {
      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 100,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createLedgersAndFunds = () => {
    return createLedgerViaApi('first')
      .then(() => createLedgerViaApi('second'))
      .then(() => createFundWithBudget({
        ledgerId: testData.ledgers.first.id,
        fiscalYearId: testData.fiscalYears.first.id,
      }))
      .then((fundAData) => {
        testData.funds.fundA = fundAData.fund;
        testData.budgets.fundA = fundAData.budget;
      })
      .then(() => {
        return createFundWithBudget({
          ledgerId: testData.ledgers.second.id,
          fiscalYearId: testData.fiscalYears.first.id,
        });
      })
      .then((fundBData) => {
        testData.funds.fundB = fundBData.fund;
        testData.budgets.fundB = fundBData.budget;
      });
  };

  const createOrganizationAndReferenceData = () => {
    return Organizations.createOrganizationViaApi({ ...NewOrganization.defaultUiOrganizations })
      .then((organizationId) => {
        testData.organization = {
          ...NewOrganization.defaultUiOrganizations,
          id: organizationId,
        };
      })
      .then(() => cy.getBatchGroups())
      .then((batchGroup) => {
        testData.batchGroupId = batchGroup.id;
      })
      .then(() => {
        return cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        });
      })
      .then((acquisitionMethod) => {
        testData.acquisitionMethodId = acquisitionMethod.body.acquisitionMethods[0].id;
      });
  };

  const getDefaultOneTimeOrder = () => {
    return {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id, orderType: 'One-Time' }),
      orderType: 'One-Time',
      approved: true,
      reEncumber: true,
    };
  };

  const createOrderWithLine = ({ totalAmount, fundDistribution }) => {
    return Orders.createOrderViaApi(getDefaultOneTimeOrder()).then((orderResponse) => {
      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        id: uuid(),
        purchaseOrderId: orderResponse.id,
        acquisitionMethod: testData.acquisitionMethodId,
        cost: {
          ...BasicOrderLine.defaultOrderLine.cost,
          listUnitPrice: totalAmount,
          quantityPhysical: 1,
          poLineEstimatedPrice: totalAmount,
        },
        fundDistribution,
        locations: [],
        physical: {
          materialSupplier: testData.organization.id,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
        },
      };

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return {
            order: orderResponse,
            orderLine: orderLineResponse,
          };
        });
      });
    });
  };

  const createOrderLinesData = () => {
    return createOrderWithLine({
      totalAmount: 10,
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
          distributionType: 'amount',
          value: 10,
        },
      ],
    })
      .then(() => {
        return createOrderWithLine({
          totalAmount: 15,
          fundDistribution: [
            {
              code: testData.funds.fundB.code,
              fundId: testData.funds.fundB.id,
              distributionType: 'amount',
              value: 15,
            },
          ],
        });
      })
      .then(() => {
        return createOrderWithLine({
          totalAmount: 50,
          fundDistribution: [
            {
              code: testData.funds.fundA.code,
              fundId: testData.funds.fundA.id,
              distributionType: 'amount',
              value: 30,
            },
            {
              code: testData.funds.fundB.code,
              fundId: testData.funds.fundB.id,
              distributionType: 'amount',
              value: 20,
            },
          ],
        });
      })
      .then(({ order, orderLine }) => {
        testData.orders.third = order;
        testData.orderLines.third = orderLine;
      });
  };

  const performRolloverToSecondFiscalYear = (ledger, rolloverType = 'Commit') => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      needCloseBudgets: false,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: 'None',
          addAvailableTo: 'Allocation',
        },
      ],
      encumbrancesRollover: [{ orderType: 'One-time', basedOn: 'InitialAmount' }],
    });

    return LedgerRollovers.createLedgerRolloverViaApi({
      ...rollover,
      rolloverType,
    });
  };

  const performPreviewAndCommitRollover = (ledger) => {
    return performRolloverToSecondFiscalYear(ledger, 'Preview').then(() => {
      return performRolloverToSecondFiscalYear(ledger, 'Commit');
    });
  };

  const createAndPayInvoice = () => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      poLineId: testData.orderLines.third.id,
      fiscalYearId: testData.fiscalYears.first.id,
      batchGroupId: testData.batchGroupId,
      fundDistributions: testData.orderLines.third.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: 50,
    }).then((invoiceResponse) => {
      testData.invoice = invoiceResponse;
      return Invoices.changeInvoiceStatusViaApi({
        invoice: invoiceResponse,
        status: INVOICE_STATUSES.PAID,
        searchParams: { poLinePaymentStatus: INVOICE_POL_PAYMENT_STATUSES.FULLY_PAID },
      });
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
  };

  before(() => {
    cy.getAdminToken();
    return createFiscalYearsData()
      .then(() => createLedgersAndFunds())
      .then(() => createOrganizationAndReferenceData())
      .then(() => createOrderLinesData())
      .then(() => performPreviewAndCommitRollover(testData.ledgers.first))
      .then(() => performPreviewAndCommitRollover(testData.ledgers.second))
      .then(() => {
        const updatedFirstFY = {
          ...testData.fiscalYears.first,
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        };
        return FiscalYears.updateFiscalYearViaApi(updatedFirstFY).then(() => {
          testData.fiscalYears.first = {
            ...updatedFirstFY,
            _version: updatedFirstFY._version + 1,
          };
        });
      })
      .then(() => {
        const updatedSecondFY = {
          ...testData.fiscalYears.second,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        };
        return FiscalYears.updateFiscalYearViaApi(updatedSecondFY).then(() => {
          testData.fiscalYears.second = {
            ...updatedSecondFY,
            _version: updatedSecondFY._version + 1,
          };
        });
      })
      .then(() => createAndPayInvoice())
      .then(() => createUserAndLogin());
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C399059 Test rollovers within 3 FYs when PO line contains two fund distributions related to different ledgers and same fiscal year (Thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C399059'] },
    () => {
      FinanceHelp.searchByName(testData.ledgers.first.name);
      Ledgers.selectLedger(testData.ledgers.first.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
        testData.fiscalYears.third.code,
        'None',
        'Allocation',
        true,
      ).then((ledgerRolloverId) => {
        Ledgers.rolloverLogs();
        Ledgers.exportRolloverError(testData.todayDate);
        Ledgers.checkDownloadedErrorFile({
          fileName: `${testData.fileNameDate}-error.csv`,
          ledgerRolloverId,
          errorType: 'Order',
          failedAction: 'Create encumbrance',
          errorMessage: `[WARNING] Part of the encumbrances belong to the ledger, which has not been rollovered. Ledgers to rollover: ${testData.ledgers.second.name} (id=${testData.ledgers.second.id})`,
          amount: '30',
          fundId: testData.funds.fundA.id,
          orderId: testData.orders.third.id,
          orderLineId: testData.orderLines.third.id,
        });
        Ledgers.deleteDownloadedFile(`${testData.fileNameDate}-error.csv`);
        Ledgers.exportRollover(testData.todayDate);
        Ledgers.checkDownloadedFileWithAllTansactions(
          `${testData.fileNameDate}-result.csv`,
          testData.funds.fundA,
          testData.fiscalYears.third,
          '100',
          '100',
          '100',
          '0',
          '0',
          '100',
          '0',
          '100',
          '40',
          '0',
          '0',
          '40',
          '0',
          '0',
          '100',
          '60',
        );
        Ledgers.deleteDownloadedFile(`${testData.fileNameDate}-result.csv`);
      });
      Ledgers.closeOpenedPage();
      FinanceHelp.searchByName(testData.ledgers.second.name);
      Ledgers.selectLedger(testData.ledgers.second.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverForOneTimeOrdersWithAllocationAndWithoutCloseBudgets(
        testData.fiscalYears.third.code,
        'None',
        'Allocation',
        true,
      ).then((ledgerRolloverId) => {
        Ledgers.rolloverLogs();
        Ledgers.exportRolloverError(testData.todayDate);
        Ledgers.checkDownloadedErrorFile({
          fileName: `${testData.fileNameDate}-error.csv`,
          ledgerRolloverId,
          errorType: 'Order',
          failedAction: 'Create encumbrance',
          errorMessage: `[WARNING] Part of the encumbrances belong to the ledger, which has not been rollovered. Ledgers to rollover: ${testData.ledgers.first.name} (id=${testData.ledgers.first.id})`,
          amount: '20',
          fundId: testData.funds.fundB.id,
          orderId: testData.orders.third.id,
          orderLineId: testData.orderLines.third.id,
        });
        Ledgers.deleteDownloadedFile(`${testData.fileNameDate}-error.csv`);
        Ledgers.exportRollover(testData.todayDate);
        Ledgers.checkDownloadedFileWithAllTansactions(
          `${testData.fileNameDate}-result.csv`,
          testData.funds.fundB,
          testData.fiscalYears.third,
          '100',
          '100',
          '100',
          '0',
          '0',
          '100',
          '0',
          '100',
          '35',
          '0',
          '0',
          '35',
          '0',
          '0',
          '100',
          '65',
        );
        Ledgers.deleteDownloadedFile(`${testData.fileNameDate}-result.csv`);
      });
    },
  );
});
