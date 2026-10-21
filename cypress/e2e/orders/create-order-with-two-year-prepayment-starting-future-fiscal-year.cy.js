import moment from 'moment';
import uuid from 'uuid';

import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import { FUND_DISTRIBUTION_TYPES, FUND_STATUSES } from '../../support/constants/finance/fund';
import { LEDGER_STATUSES } from '../../support/constants/finance/ledger';
import { ORDER_STATUSES, ORDER_TYPES } from '../../support/constants/orders/order';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_VALUES,
} from '../../support/constants/orders/order-line';
import { Permissions } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import { DateTools, ExecutionFlowManager, NumberTools } from '../../support/utils';
import FileManager from '../../support/utils/fileManager';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditFormFragment from '../../support/fragments/orders/orderLineEditForm';
import MultiYearPaymentTerms from '../../support/fragments/orders/multiYearPaymentTerms';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomStringCode from '../../support/utils/generateTextCode';
import { parsePrepaymentFiscalYearDistribution } from '../../support/utils/ordersExport';
import { FinanceHelper } from '../../support/fragments/finance';

// Temporary Jenkins diagnostics; remove after the freeze investigation.
const trace = (message) => cy.task('log', `[C1404903] ${message}`);

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };

// The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
// #freeze pipeline deadlock
describe('Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    FY1: 'fy1',
    FY2: 'fy2',
    FY3: 'fy3',
    FY4: 'fy4',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    EXPENSE_CLASS: 'expenseClass',
    BUDGET_A1: 'budgetA1',
    BUDGET_A2: 'budgetA2',
    BUDGET_B1: 'budgetB1',
    BUDGET_B2: 'budgetB2',
    LOCALE: 'locale',
    ORG: 'org',
    ORDER: 'order',
    POL: 'pol',
    USER: 'user',
    ACQ_METHOD: 'acqMethod',
    POL_LIMIT: 'polLimit',
  };

  const testData = {
    polTitle: `AT_POL_${getRandomPostfix()}`,
    secondPolTitle: `AT_POL_SECOND_${getRandomPostfix()}`,
    csvFileName: `order-export-${moment().format('YYYY-MM-DD')}-*.csv`,
  };

  const CSV_HEADERS = {
    MULTI_YEAR_PREPAYMENT: 'Multi-year prepayment',
    PREPAYMENT_TERM: 'Prepayment term',
    STARTING_FISCAL_YEAR: 'Prepayment starting fiscal year',
    TOTAL_PRICE: 'Prepayment total price',
    FISCAL_YEAR_DISTRIBUTIONS: 'Prepayment fiscal year, Fund code, Expense class, Value, Amount',
  };

  const getParsedPrepaymentDistributionByFiscalYear = (row, fyCode) => {
    const exportValue = row?.[CSV_HEADERS.FISCAL_YEAR_DISTRIBUTIONS] || '';

    return parsePrepaymentFiscalYearDistribution(exportValue).filter(
      (distribution) => distribution.fyCode === fyCode,
    );
  };

  const FUND_DISTRIBUTION_VALIDATION_PATH = '**/orders/order-lines/fund-distributions/validate';

  const createBudgetStep = (fundKey, fiscalYearKey, budgetKey, budgetStatus) => (f) => {
    trace('FLOW: createBudgetStep');
    const { [fundKey]: fund, [fiscalYearKey]: fiscalYear, expenseClass } = f.ctx();

    trace('Budgets.createViaApi (site 93)');
    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: fiscalYear.id,
      fundId: fund.id,
      allocated: 1000,
      budgetStatus,
    }).then((budget) => {
      trace('Budgets.updateBudgetViaApi (site 99)');
      return Budgets.updateBudgetViaApi({
        ...budget,
        statusExpenseClasses: [
          {
            status: BUDGET_STATUSES.ACTIVE,
            expenseClassId: expenseClass.id,
          },
        ],
      }).then(() => {
        f.set(budgetKey, budget, () => {
          trace('Budgets.deleteViaApi (site 108)');
          return Budgets.deleteViaApi(budget.id, false);
        });
      });
    });
  };

  before(() => {
    trace('SETUP: start');

    trace('cy.getAdminToken (site 113)');
    cy.getAdminToken();
    trace('cy.clearLocalStorage (site 114)');
    cy.clearLocalStorage();

    trace('cy.getTenantLocaleApi (site 116)');
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: "Set purchase order lines limit" is set to more than 1
      .step(() => {
        trace('FLOW: step 1');

        trace('OrderLinesLimit.setPOLLimitViaApi (site 121)');
        return OrderLinesLimit.setPOLLimitViaApi(2);
      })
      // Precondition 2: Create a current FY and three future FYs in the same series
      .step((f) => {
        trace('FLOW: step 2');

        const series = getRandomStringCode(5);

        trace('cy.wrap (site 127)');
        return cy.wrap([R.FY1, R.FY2, R.FY3, R.FY4]).each((key, index) => {
          trace('FiscalYears.createViaApi (site 128)');
          return FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(index),
            code: `${series}${new Date().getFullYear() + index}`,
            series,
          }).then((fy) => {
            f.set(key, fy, () => {
              trace('FiscalYears.deleteFiscalYearViaApi (site 134)');
              return FiscalYears.deleteFiscalYearViaApi(fy.id, false);
            });
          });
        });
      })
      // Precondition 3: Create active Ledger related to FY1
      .step((f) => {
        trace('FLOW: step 3');

        const { fy1 } = f.ctx();
        trace('Ledgers.createViaApi (site 141)');
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => {
            trace('Ledgers.deleteLedgerViaApi (site 146)');
            return Ledgers.deleteLedgerViaApi(ledger.id, false);
          });
        });
      })
      // Precondition 4: Create Fund A
      .step((f) => {
        trace('FLOW: step 4');

        const { ledger } = f.ctx();
        trace('Funds.createViaApi (site 152)');
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
          name: `AT_FUND_${R.FUND_A}_${getRandomPostfix()}`,
          code: `${R.FUND_A}${getRandomPostfix()}`,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then((response) => {
          f.set(R.FUND_A, response.fund, () => {
            trace('Funds.deleteFundViaApi (site 159)');
            return Funds.deleteFundViaApi(response.fund.id, false);
          });
        });
      })
      // Precondition 4: Create Fund B
      .step((f) => {
        trace('FLOW: step 5');

        const { ledger } = f.ctx();
        trace('Funds.createViaApi (site 165)');
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          name: `AT_FUND_${R.FUND_B}_${getRandomPostfix()}`,
          code: `${R.FUND_B}${getRandomPostfix()}`,
          ledgerId: ledger.id,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then((response) => {
          f.set(R.FUND_B, response.fund, () => {
            trace('Funds.deleteFundViaApi (site 172)');
            return Funds.deleteFundViaApi(response.fund.id, false);
          });
        });
      })
      // Precondition 4: Create expense class "Electronic"
      .step((f) => {
        trace('FLOW: step 6');

        trace('ExpenseClasses.createExpenseClassViaApi (site 177)');
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `Electronic_${getRandomPostfix()}`,
          code: `EL${getRandomPostfix()}`,
        }).then((ec) => {
          f.set(R.EXPENSE_CLASS, ec, () => {
            trace('ExpenseClasses.deleteExpenseClassViaApi (site 182)');
            return ExpenseClasses.deleteExpenseClassViaApi(ec.id, { failOnStatusCode: false });
          });
        });
      })
      // Precondition 4: Create budget for Fund A in FY1 with expense class
      .step(createBudgetStep(R.FUND_A, R.FY1, R.BUDGET_A1, BUDGET_STATUSES.ACTIVE))
      // Precondition 4: Create budget for Fund A in FY2 with expense class
      .step(createBudgetStep(R.FUND_A, R.FY2, R.BUDGET_A2, BUDGET_STATUSES.PLANNED))
      // Precondition 4: Create budget for Fund B in FY1 with expense class
      .step(createBudgetStep(R.FUND_B, R.FY1, R.BUDGET_B1, BUDGET_STATUSES.ACTIVE))
      // Precondition 4: Create budget for Fund B in FY2 with expense class
      .step(createBudgetStep(R.FUND_B, R.FY2, R.BUDGET_B2, BUDGET_STATUSES.PLANNED))
      // Precondition 5: Fetch acquisition method "Other" for POL creation
      .step((f) => {
        trace('FLOW: step 7');

        trace('cy.getAcquisitionMethodsApi (site 195)');
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
          })
          .then(({ body }) => {
            f.set(R.ACQ_METHOD, body.acquisitionMethods[0].id);
          });
      })
      // Precondition 5: Create organization (vendor)
      .step((f) => {
        trace('FLOW: step 8');

        trace('NewOrganization.createViaApi (site 205)');
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => {
              trace('Organizations.deleteOrganizationViaApi (site 207)');
              return Organizations.deleteOrganizationViaApi(org.id);
            });
          },
        );
      })
      // Precondition 5: Create Ongoing order in Pending status
      .step((f) => {
        trace('FLOW: step 9');

        const { org } = f.ctx();
        trace('Orders.createOrderViaApi (site 214)');
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: org.id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          workflowStatus: ORDER_STATUSES.PENDING,
        }).then((order) => {
          f.set(R.ORDER, order, () => {
            trace('Orders.deleteOrderViaApi (site 221)');
            return Orders.deleteOrderViaApi(order.id, false);
          });
        });
      })
      // Precondition 5: Create POL with 4-year multi-year prepayment starting FY1
      .step((f) => {
        trace('FLOW: step 10');

        const { order, fundA, fundB, fy1, fy2, fy3, fy4, expenseClass, acqMethod } = f.ctx();
        trace('OrderLines.createOrderLineViaApi (site 227)');
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            title: testData.polTitle,
            listUnitPrice: 100,
            quantity: 1,
            acquisitionMethod: acqMethod,
          }),
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          multiYearPayment: true,
          paymentTerms: {
            totalPrice: 100,
            prepaymentTerm: 4,
            startingFiscalYearId: fy1.id,
            fiscalYearDistributions: [
              {
                fiscalYearId: fy1.id,
                fundDistributions: [
                  {
                    fundId: fundA.id,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 25,
                    expenseClassId: expenseClass.id,
                  },
                  {
                    fundId: fundB.id,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 25,
                    expenseClassId: expenseClass.id,
                  },
                ],
              },
              {
                fiscalYearId: fy2.id,
                fundDistributions: [
                  {
                    fundId: fundA.id,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 25,
                    expenseClassId: expenseClass.id,
                  },
                ],
              },
              {
                fiscalYearId: fy3.id,
                fundDistributions: [
                  { fundId: fundB.id, distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT, value: 25 },
                ],
              },
              {
                fiscalYearId: fy4.id,
                fundDistributions: [],
              },
            ],
          },
        }).then((pol) => {
          f.set(R.POL, pol, () => {
            trace('OrderLines.deleteOrderLineViaApi (site 283)');
            return OrderLines.deleteOrderLineViaApi(pol.id, false);
          });
        });
      })
      // Precondition 6: Create authorized user with Orders edit/create + export CSV permissions
      .step((f) => {
        trace('FLOW: step 11');

        trace('cy.createTempUser (site 288)');
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiExportOrders.gui,
          ])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => {
              trace('Users.deleteViaApi (site 295)');
              return Users.deleteViaApi(userProperties.userId);
            });
          });
      })
      // Precondition 7: Log in and navigate to Orders; open details pane for the order
      .step((f) => {
        trace('FLOW: step 12');

        const { user, order } = f.ctx();
        trace('cy.login (site 301)');
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        trace('Orders.selectOrderByPONumber (site 305)');
        Orders.selectOrderByPONumber(order.poNumber);
        trace('OrderDetails.waitLoading (site 306)');
        OrderDetails.waitLoading();
      });

    trace('SETUP: complete');
  });

  after(() => {
    trace('CLEANUP: start');

    trace('cy.getAdminToken (site 311)');
    cy.getAdminToken();
    trace('FileManager.deleteFilesFromDownloadsByMask (site 312)');
    FileManager.deleteFilesFromDownloadsByMask(testData.csvFileName);
    trace('flow.cleanup (site 313)');
    flow.cleanup();

    trace('CLEANUP: complete');
  });

  // The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
  // #freeze pipeline deadlock
  it(
    'C1404903 Create an order with two-year prepayment term starting from the future fiscal year (thunderjet)',
    { tags: ['extendedPathBroken', 'thunderjet', 'C1404903Broken'] },
    () => {
      trace('TEST: start');

      const { fy1, fy2, fy3, fy4, fundA, fundB, expenseClass, locale } = flow.ctx();

      const triggerValidation = () => {
        trace('OrderLineEditForm.scrollToPaymentTermsSection (site 325)');
        OrderLineEditForm.scrollToPaymentTermsSection();
        trace('cy.wait (site 326)');
        cy.wait('@validateFD');
      };
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);
      const assertEnteredFutureYearDistributions = () => {
        trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 330)');
        OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode: fy2.code,
          distributions: [
            {
              fundName: fundA.name,
              fundCode: fundA.code,
              expenseClassName: expenseClass.name,
              value: 50,
            },
          ],
        });
        trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 341)');
        OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode: fy3.code,
          distributions: [
            { fundName: fundA.name, fundCode: fundA.code, value: 10 },
            { fundName: fundB.name, fundCode: fundB.code, value: 10 },
          ],
        });
      };

      trace('cy.intercept (site 350)');
      cy.intercept('PUT', FUND_DISTRIBUTION_VALIDATION_PATH).as('validateFD');
      trace('FinanceHelper.interceptGetFiscalYearsRequest (site 351)');
      FinanceHelper.interceptGetFiscalYearsRequest();

      trace('Step 1. Click on the PO line record; Click "Actions" button; Select "Edit" option');
      trace('OrderDetails.openPolDetails (site 354)');
      OrderDetails.openPolDetails(testData.polTitle);
      trace('OrderLineDetails.openOrderLineEditForm (site 355)');
      OrderLineDetails.openOrderLineEditForm();

      trace('FinanceHelper.waitForGetFiscalYearsRequestCompletion (site 357)');
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      trace('OrderLineEditForm.scrollToPaymentTermsSection (site 359)');
      OrderLineEditForm.scrollToPaymentTermsSection();
      trace('OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled (site 360)');
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      trace('OrderLineEditForm.assertPrepaymentTermValue (site 361)');
      OrderLineEditForm.assertPrepaymentTermValue(4);
      trace('OrderLineEditForm.assertFiscalYearCards (site 362)');
      OrderLineEditForm.assertFiscalYearCards([fy1.code, fy2.code, fy3.code, fy4.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 363)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable(
        [fy1.code, fy2.code, fy3.code, fy4.code],
        fy4.code,
      );
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 367)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy1.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            expenseClassName: expenseClass.name,
            value: 25,
          },
          {
            fundName: fundB.name,
            fundCode: fundB.code,
            expenseClassName: expenseClass.name,
            value: 25,
          },
        ],
      });
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 384)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy2.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            expenseClassName: expenseClass.name,
            value: 25,
          },
        ],
      });
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 395)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy3.code,
        distributions: [{ fundName: fundB.name, fundCode: fundB.code, value: 25 }],
      });
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 399)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [],
      });
      trace('OrderLineEditForm.assertAddFiscalYearButtonDisabled (site 403)');
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      trace('Step 2. Select the next future fiscal year in the "Starting fiscal year" dropdown');
      trace('OrderLineEditForm.selectStartingFiscalYear (site 406)');
      OrderLineEditForm.selectStartingFiscalYear(fy2.code);

      trace('FinanceHelper.waitForGetFiscalYearsRequestCompletion (site 408)');
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      trace('OrderLineEditForm.assertPrepaymentTermValue (site 410)');
      OrderLineEditForm.assertPrepaymentTermValue(2);
      trace('OrderLineEditForm.assertFiscalYearCards (site 411)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 412)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 413)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy2.code,
        distributions: [],
      });
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 417)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy3.code,
        distributions: [],
      });
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 421)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      trace('Step 3. Click "Add fiscal year" button');
      trace('OrderLineEditForm.clickAddFiscalYearButton (site 424)');
      OrderLineEditForm.clickAddFiscalYearButton();
      trace('OrderLineEditForm.assertPrepaymentTermValue (site 425)');
      OrderLineEditForm.assertPrepaymentTermValue(3);
      trace('OrderLineEditForm.assertFiscalYearCards (site 426)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 427)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code, fy4.code], fy4.code);
      [fy2.code, fy3.code, fy4.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 429)');
        OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode,
          distributions: [],
        });
      });
      trace('OrderLineEditForm.assertAddFiscalYearButtonDisabled (site 434)');
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      trace('Step 4. Fill in the Fiscal year cards with fund distribution data');
      // The first card now represents FY2 because the starting fiscal year was shifted in step 2.
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 438)');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 439)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('cy.wait (site 444)');
      cy.wait(1000);
      trace('OrderLineEditForm.selectExpenseClassInFYCard (site 445)');
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy2.code,
        expenseClassName: expenseClass.name,
      });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 449)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 50,
      });

      // The second card (FY3) contains Fund A and Fund B, each with $10.
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 455)');
      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 456)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('triggerValidation (site 461)');
      triggerValidation();
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 462)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 10,
      });
      trace('triggerValidation (site 466)');
      triggerValidation();

      trace('OrderLineEditForm.addFundDistributionInFYCard (site 468)');
      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 469)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      trace('triggerValidation (site 475)');
      triggerValidation();
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 476)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 10,
        rowIndex: 1,
      });
      trace('triggerValidation (site 481)');
      triggerValidation();

      // The third card (FY4) contains Fund A and Fund B, each with 15%.
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 484)');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 485)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('triggerValidation (site 490)');
      triggerValidation();
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 491)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 492)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 15,
      });
      trace('triggerValidation (site 496)');
      triggerValidation();

      trace('OrderLineEditForm.addFundDistributionInFYCard (site 498)');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 499)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      trace('triggerValidation (site 505)');
      triggerValidation();
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 506)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code, rowIndex: 1 });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 507)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 15,
        rowIndex: 1,
      });
      trace('triggerValidation (site 512)');
      triggerValidation();

      trace('OrderLineEditForm.assertPrepaymentTermsRemainingAmount (site 514)');
      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));
      trace('assertEnteredFutureYearDistributions (site 515)');
      assertEnteredFutureYearDistributions();
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 516)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [
          { fundName: fundA.name, fundCode: fundA.code, value: 15 },
          { fundName: fundB.name, fundCode: fundB.code, value: 15 },
        ],
      });

      trace('Step 5. Click trash icon next to the Fiscal year 3 card');
      trace('OrderLineEditForm.removeLastFYCard (site 525)');
      OrderLineEditForm.removeLastFYCard();
      trace('triggerValidation (site 526)');
      triggerValidation();

      trace('OrderLineEditForm.assertPrepaymentTermValue (site 528)');
      OrderLineEditForm.assertPrepaymentTermValue(2);
      trace('OrderLineEditForm.assertFiscalYearCards (site 529)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 530)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      trace('assertEnteredFutureYearDistributions (site 531)');
      assertEnteredFutureYearDistributions();
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 532)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();
      trace('OrderLineEditForm.assertPrepaymentTermsDistributionError (site 533)');
      OrderLineEditForm.assertPrepaymentTermsDistributionError(formatAmount(30));

      trace('Step 6. Click "Add fiscal year" button');
      trace('OrderLineEditForm.clickAddFiscalYearButton (site 536)');
      OrderLineEditForm.clickAddFiscalYearButton();
      trace('OrderLineEditForm.assertPrepaymentTermValue (site 537)');
      OrderLineEditForm.assertPrepaymentTermValue(3);
      trace('OrderLineEditForm.assertFiscalYearCards (site 538)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 539)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code, fy4.code], fy4.code);
      trace('assertEnteredFutureYearDistributions (site 540)');
      assertEnteredFutureYearDistributions();
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 541)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [],
      });
      trace('OrderLineEditForm.assertAddFiscalYearButtonDisabled (site 545)');
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      trace(
        'Step 7. Fill in Fiscal year 3 card with valid values; Click trash icon next to the Fiscal year 3 card',
      );
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 550)');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 551)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      trace('triggerValidation (site 557)');
      triggerValidation();
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 558)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 30,
        rowIndex: 0,
      });
      trace('triggerValidation (site 563)');
      triggerValidation();

      trace('OrderLineEditForm.assertPrepaymentTermsRemainingAmount (site 565)');
      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));

      trace('OrderLineEditForm.removeLastFYCard (site 567)');
      OrderLineEditForm.removeLastFYCard();

      trace('OrderLineEditForm.assertPrepaymentTermValue (site 569)');
      OrderLineEditForm.assertPrepaymentTermValue(2);
      trace('OrderLineEditForm.assertFiscalYearCards (site 570)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 571)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      trace('assertEnteredFutureYearDistributions (site 572)');
      assertEnteredFutureYearDistributions();
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 573)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      trace(
        'Step 8. Add Fund A with expense class in the "Fund distribution" accordion; Change value to 80 in the Fiscal year 1 card; Click "Save & close" button',
      );
      trace('OrderLineEditForm.scrollToFundDistributionSection (site 578)');
      OrderLineEditForm.scrollToFundDistributionSection();
      trace('OrderLineEditForm.clickAddFundDistributionButton (site 579)');
      OrderLineEditForm.clickAddFundDistributionButton();
      trace('OrderLineEditForm.expandFundIdDropdown (site 580)');
      OrderLineEditForm.expandFundIdDropdown(0);
      trace('OrderLineEditForm.selectFundFromOpenDropdown (site 581)');
      OrderLineEditForm.selectFundFromOpenDropdown(fundA.name, fundA.code);
      trace('OrderLineEditForm.selectExpenseClass (site 582)');
      OrderLineEditForm.selectExpenseClass(expenseClass.name, 0);
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 583)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 80,
        rowIndex: 0,
      });
      trace('triggerValidation (site 588)');
      triggerValidation();

      trace('OrderLineEditForm.clickSaveButton (site 590)');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      trace('OrderLineDetails.waitLoading (site 591)');
      OrderLineDetails.waitLoading();

      trace('OrderLineDetails.checkFundDistibutionTableContent (site 593)');
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: fundA.name, expenseClass: expenseClass.name },
      ]);
      trace('OrderLineDetails.assertPaymentTerms (site 596)');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(100),
        prepaymentTerm: 2,
        startingFiscalYear: fy2.code,
        distributions: [
          {
            fyCode: fy2.code,
            rows: [
              {
                fundName: fundA.name,
                expenseClass: expenseClass.name,
                value: '80',
                amount: formatAmount(80),
              },
            ],
          },
          {
            fyCode: fy3.code,
            rows: [
              { fundName: fundA.name, value: '10', amount: formatAmount(10) },
              { fundName: fundB.name, value: '10', amount: formatAmount(10) },
            ],
          },
        ],
      });

      trace(
        'Step 9. Click left back arrow; Click "Actions" button in "PO lines" accordion; Select "Add PO line" option',
      );
      trace('OrderLineDetails.backToOrderDetails (site 625)');
      OrderLineDetails.backToOrderDetails();
      trace('OrderDetails.selectAddPOLine (site 626)');
      OrderDetails.selectAddPOLine();
      trace('OrderLineEditForm.waitLoading (site 627)');
      OrderLineEditForm.waitLoading();

      trace(
        'Step 10. Check "Multi-year prepayment" checkbox; Fill in required fields; Select current FY in "Starting fiscal year" dropdown; Remove all FY cards; Click "Save & close" button',
      );
      trace('OrderLineEditForm.toggleMultiYearPrepayment (site 632)');
      OrderLineEditForm.toggleMultiYearPrepayment();
      trace('OrderLineEditForm.fillItemDetails (site 633)');
      OrderLineEditForm.fillItemDetails({ title: testData.secondPolTitle });
      trace('OrderLineEditForm.fillPoLineDetails (site 634)');
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
      });
      trace('OrderLineEditForm.fillCostDetails (site 638)');
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '100', quantityPhysical: '1' });
      trace('OrderLineEditForm.fillPrepaymentTotalPrice (site 639)');
      OrderLineEditForm.fillPrepaymentTotalPrice(100);
      trace('OrderLineEditForm.selectStartingFiscalYear (site 640)');
      OrderLineEditForm.selectStartingFiscalYear(fy1.code);

      trace('FinanceHelper.waitForGetFiscalYearsRequestCompletion (site 642)');
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      trace('OrderLineEditForm.scrollToPaymentTermsSection (site 644)');
      OrderLineEditForm.scrollToPaymentTermsSection();
      trace('OrderLineEditForm.removeLastFYCard (site 645)');
      OrderLineEditForm.removeLastFYCard();
      trace('OrderLineEditForm.removeLastFYCard (site 646)');
      OrderLineEditForm.removeLastFYCard();
      trace('OrderLineEditForm.clickSaveButton (site 647)');
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: false });
      trace('OrderLineEditForm.waitLoading (site 648)');
      OrderLineEditForm.waitLoading();
      trace('OrderLineEditForm.assertAtLeastTwoFYsValidationError (site 649)');
      OrderLineEditForm.assertAtLeastTwoFYsValidationError();

      trace(
        'Step 11. Add two FY cards; Click "Add fund distribution" in FY1 card; Select Fund A; Select expense class; Change type to %; Click "Save & close"',
      );
      trace('OrderLineEditForm.clickAddFiscalYearButton (site 654)');
      OrderLineEditForm.clickAddFiscalYearButton();
      trace('OrderLineEditForm.clickAddFiscalYearButton (site 655)');
      OrderLineEditForm.clickAddFiscalYearButton();
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 656)');
      OrderLineEditForm.addFundDistributionInFYCard(fy1.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 657)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy1.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('triggerValidation (site 662)');
      triggerValidation();
      trace('OrderLineEditForm.selectExpenseClassInFYCard (site 663)');
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy1.code,
        expenseClassName: expenseClass.name,
      });
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 667)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy1.code });
      trace('triggerValidation (site 668)');
      triggerValidation();

      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 670)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy1.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            expenseClassName: expenseClass.name,
            value: 100,
          },
        ],
      });

      trace('OrderLineEditForm.clickSaveButton (site 682)');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      trace('OrderLineDetails.waitLoading (site 683)');
      OrderLineDetails.waitLoading();

      trace('OrderLineDetails.assertPaymentTerms (site 685)');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(100),
        prepaymentTerm: 2,
        startingFiscalYear: fy1.code,
        distributions: [
          {
            fyCode: fy1.code,
            rows: [
              {
                fundName: fundA.name,
                expenseClass: expenseClass.name,
                value: '100%',
                amount: formatAmount(100),
              },
            ],
          },
          { fyCode: fy2.code, rows: [] },
        ],
      });

      trace(
        'Step 12. Click "Actions" button on the "Orders" pane; Select "Export results (CSV)" option; Leave "All" selected; Click "Export" button',
      );
      trace('OrderLineDetails.backToOrderDetails (site 708)');
      OrderLineDetails.backToOrderDetails();
      trace('OrderDetails.closeOrderDetails (site 709)');
      OrderDetails.closeOrderDetails();
      trace('Orders.waitLoading (site 710)');
      Orders.waitLoading();
      trace('Orders.exportResultsToCsv (site 711)');
      Orders.exportResultsToCsv();

      trace('Step 13. Open downloaded .csv file');
      trace('FileManager.convertCsvToJson (site 714)');
      FileManager.convertCsvToJson(testData.csvFileName).then((data) => {
        const firstPoLine = data.find((row) => row[CSV_HEADERS.STARTING_FISCAL_YEAR] === fy2.code);
        const secondPoLine = data.find((row) => row[CSV_HEADERS.STARTING_FISCAL_YEAR] === fy1.code);
        const firstFyDistributions = getParsedPrepaymentDistributionByFiscalYear(
          firstPoLine,
          fy2.code,
        );
        const firstFy3Distributions = getParsedPrepaymentDistributionByFiscalYear(
          firstPoLine,
          fy3.code,
        );
        const secondFyDistributions = getParsedPrepaymentDistributionByFiscalYear(
          secondPoLine,
          fy1.code,
        );

        // The Orders search from precondition 7 remains applied, so the export must contain
        // exactly the two PO lines of this order. Their different starting FYs identify them.
        expect(data).to.have.length(2);
        expect(firstPoLine).to.not.equal(null);
        expect(secondPoLine).to.not.equal(null);

        [firstPoLine, secondPoLine].forEach((row) => {
          expect(String(row[CSV_HEADERS.MULTI_YEAR_PREPAYMENT]).toLowerCase()).to.equal('true');
          expect(String(row[CSV_HEADERS.PREPAYMENT_TERM])).to.equal('2');
          expect(String(row[CSV_HEADERS.TOTAL_PRICE])).to.equal('100');
        });

        expect(firstPoLine[CSV_HEADERS.STARTING_FISCAL_YEAR]).to.equal(fy2.code);
        expect(firstFyDistributions).to.deep.equal([
          {
            fyCode: fy2.code,
            fundCode: fundA.code,
            expenseClass: expenseClass.name,
            value: '80',
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            amount: '80',
          },
        ]);
        expect(firstFy3Distributions).to.deep.equal([
          {
            fyCode: fy3.code,
            fundCode: fundA.code,
            expenseClass: '',
            value: '10',
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            amount: '10',
          },
          {
            fyCode: fy3.code,
            fundCode: fundB.code,
            expenseClass: '',
            value: '10',
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            amount: '10',
          },
        ]);
        expect(firstPoLine[CSV_HEADERS.FISCAL_YEAR_DISTRIBUTIONS]).to.not.include(fy4.code);

        expect(secondPoLine[CSV_HEADERS.STARTING_FISCAL_YEAR]).to.equal(fy1.code);
        expect(secondFyDistributions).to.deep.equal([
          {
            fyCode: fy1.code,
            fundCode: fundA.code,
            expenseClass: expenseClass.name,
            value: '100',
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            amount: '100',
          },
        ]);
        expect(secondPoLine[CSV_HEADERS.FISCAL_YEAR_DISTRIBUTIONS]).to.not.include(fy2.code);
      });

      trace('TEST: complete');
    },
  );
});
