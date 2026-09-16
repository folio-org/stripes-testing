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
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
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
import { FinanceHelper } from '../../support/fragments/finance';

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

  const parsePrepaymentFiscalYearDistribution = (value = '') => {
    return (value || '')
      .split(' | ')
      .filter(Boolean)
      .map((entry) => {
        const quotedValues = entry.match(/"([^"]*)"/g) || [];
        const values = quotedValues.map((item) => item.slice(1, -1));

        if (values.length < 5) {
          return null;
        }

        const isPercentage = values[3].endsWith('%');

        return {
          fyCode: values[0],
          fundCode: values[1],
          expenseClass: values[2],
          value: isPercentage ? values[3].slice(0, -1) : values[3],
          distributionType: isPercentage
            ? FUND_DISTRIBUTION_TYPES.PERCENTAGE
            : FUND_DISTRIBUTION_TYPES.AMOUNT,
          amount: values[4],
        };
      })
      .filter(Boolean);
  };

  const getParsedPrepaymentDistributionByFiscalYear = (row, fyCode) => {
    const exportValue = row?.[CSV_HEADERS.FISCAL_YEAR_DISTRIBUTIONS] || '';

    return parsePrepaymentFiscalYearDistribution(exportValue).filter(
      (distribution) => distribution.fyCode === fyCode,
    );
  };

  const FUND_DISTRIBUTION_VALIDATION_PATH = '**/orders/order-lines/fund-distributions/validate';

  const createBudgetStep = (fundKey, fiscalYearKey, budgetKey, budgetStatus) => (f) => {
    const { [fundKey]: fund, [fiscalYearKey]: fiscalYear, expenseClass } = f.ctx();

    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: fiscalYear.id,
      fundId: fund.id,
      allocated: 1000,
      budgetStatus,
    }).then((budget) => Budgets.updateBudgetViaApi({
      ...budget,
      statusExpenseClasses: [
        {
          status: BUDGET_STATUSES.ACTIVE,
          expenseClassId: expenseClass.id,
        },
      ],
    }).then(() => {
      f.set(budgetKey, budget, () => Budgets.deleteViaApi(budget.id, false));
    }));
  };

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: "Set purchase order lines limit" is set to more than 1
      .step(() => {
        return OrderLinesLimit.setPOLLimitViaApi(2);
      })
      // Precondition 2: Create a current FY and three future FYs in the same series
      .step((f) => {
        const series = getRandomStringCode(5);

        return cy.wrap([R.FY1, R.FY2, R.FY3, R.FY4]).each((key, index) => {
          return FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(index),
            code: `${series}${new Date().getFullYear() + index}`,
            series,
          }).then((fy) => {
            f.set(key, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id, false));
          });
        });
      })
      // Precondition 3: Create active Ledger related to FY1
      .step((f) => {
        const { fy1 } = f.ctx();
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false));
        });
      })
      // Precondition 4: Create Fund A
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
          name: `AT_FUND_${R.FUND_A}_${getRandomPostfix()}`,
          code: `${R.FUND_A}${getRandomPostfix()}`,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then((response) => {
          f.set(R.FUND_A, response.fund, () => Funds.deleteFundViaApi(response.fund.id, false));
        });
      })
      // Precondition 4: Create Fund B
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          name: `AT_FUND_${R.FUND_B}_${getRandomPostfix()}`,
          code: `${R.FUND_B}${getRandomPostfix()}`,
          ledgerId: ledger.id,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then((response) => {
          f.set(R.FUND_B, response.fund, () => Funds.deleteFundViaApi(response.fund.id, false));
        });
      })
      // Precondition 4: Create expense class "Electronic"
      .step((f) => {
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `Electronic_${getRandomPostfix()}`,
          code: `EL${getRandomPostfix()}`,
        }).then((ec) => {
          f.set(R.EXPENSE_CLASS, ec, () => ExpenseClasses.deleteExpenseClassViaApi(ec.id, { failOnStatusCode: false }));
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
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id));
          },
        );
      })
      // Precondition 5: Create Ongoing order in Pending status
      .step((f) => {
        const { org } = f.ctx();
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: org.id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          workflowStatus: ORDER_STATUSES.PENDING,
        }).then((order) => {
          f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false));
        });
      })
      // Precondition 5: Create POL with 4-year multi-year prepayment starting FY1
      .step((f) => {
        const { order, fundA, fundB, fy1, fy2, fy3, fy4, expenseClass, acqMethod } = f.ctx();
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
          f.set(R.POL, pol, () => OrderLines.deleteOrderLineViaApi(pol.id, false));
        });
      })
      // Precondition 6: Create authorized user with Orders edit/create + export CSV permissions
      .step((f) => {
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiExportOrders.gui,
          ])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
          });
      })
      // Precondition 7: Log in and navigate to Orders; open details pane for the order
      .step((f) => {
        const { user, order } = f.ctx();
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.selectOrderByPONumber(order.poNumber);
        OrderDetails.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    FileManager.deleteFilesFromDownloadsByMask(testData.csvFileName);
    flow.cleanup();
  });

  it(
    'C1404903 Create an order with two-year prepayment term starting from the future fiscal year (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1404903'] },
    () => {
      const { fy1, fy2, fy3, fy4, fundA, fundB, expenseClass, locale } = flow.ctx();

      const triggerValidation = () => {
        OrderLineEditForm.scrollToPaymentTermsSection();
        cy.wait('@validateFD');
      };
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);
      const assertEnteredFutureYearDistributions = () => {
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
        OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode: fy3.code,
          distributions: [
            { fundName: fundA.name, fundCode: fundA.code, value: 10 },
            { fundName: fundB.name, fundCode: fundB.code, value: 10 },
          ],
        });
      };

      cy.intercept('PUT', FUND_DISTRIBUTION_VALIDATION_PATH).as('validateFD');
      FinanceHelper.interceptGetFiscalYearsRequest();

      cy.log('Step 1. Click on the PO line record; Click "Actions" button; Select "Edit" option');
      OrderDetails.openPolDetails(testData.polTitle);
      OrderLineDetails.openOrderLineEditForm();

      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      OrderLineEditForm.scrollToPaymentTermsSection();
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      OrderLineEditForm.assertPrepaymentTermValue(4);
      OrderLineEditForm.assertFiscalYearCards([fy1.code, fy2.code, fy3.code, fy4.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable(
        [fy1.code, fy2.code, fy3.code, fy4.code],
        fy4.code,
      );
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
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy3.code,
        distributions: [{ fundName: fundB.name, fundCode: fundB.code, value: 25 }],
      });
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [],
      });
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log('Step 2. Select the next future fiscal year in the "Starting fiscal year" dropdown');
      OrderLineEditForm.selectStartingFiscalYear(fy2.code);

      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      OrderLineEditForm.assertPrepaymentTermValue(2);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy2.code,
        distributions: [],
      });
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy3.code,
        distributions: [],
      });
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      cy.log('Step 3. Click "Add fiscal year" button');
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.assertPrepaymentTermValue(3);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code, fy4.code], fy4.code);
      [fy2.code, fy3.code, fy4.code].forEach((fyCode) => {
        OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode,
          distributions: [],
        });
      });
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log('Step 4. Fill in the Fiscal year cards with fund distribution data');
      // The first card now represents FY2 because the starting fiscal year was shifted in step 2.
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      cy.wait(1000);
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy2.code,
        expenseClassName: expenseClass.name,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 50,
      });

      // The second card (FY3) contains Fund A and Fund B, each with $10.
      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      triggerValidation();
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 10,
      });
      triggerValidation();

      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      triggerValidation();
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 10,
        rowIndex: 1,
      });
      triggerValidation();

      // The third card (FY4) contains Fund A and Fund B, each with 15%.
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      triggerValidation();
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 15,
      });
      triggerValidation();

      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      triggerValidation();
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code, rowIndex: 1 });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 15,
        rowIndex: 1,
      });
      triggerValidation();

      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));
      assertEnteredFutureYearDistributions();
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [
          { fundName: fundA.name, fundCode: fundA.code, value: 15 },
          { fundName: fundB.name, fundCode: fundB.code, value: 15 },
        ],
      });

      cy.log('Step 5. Click trash icon next to the Fiscal year 3 card');
      OrderLineEditForm.removeLastFYCard();
      triggerValidation();

      OrderLineEditForm.assertPrepaymentTermValue(2);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      assertEnteredFutureYearDistributions();
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();
      OrderLineEditForm.assertPrepaymentTermsDistributionError(formatAmount(30));

      cy.log('Step 6. Click "Add fiscal year" button');
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.assertPrepaymentTermValue(3);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code, fy4.code], fy4.code);
      assertEnteredFutureYearDistributions();
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy4.code,
        distributions: [],
      });
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log(
        'Step 7. Fill in Fiscal year 3 card with valid values; Click trash icon next to the Fiscal year 3 card',
      );
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      triggerValidation();
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 30,
        rowIndex: 0,
      });
      triggerValidation();

      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));

      OrderLineEditForm.removeLastFYCard();

      OrderLineEditForm.assertPrepaymentTermValue(2);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      assertEnteredFutureYearDistributions();
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      cy.log(
        'Step 8. Add Fund A with expense class in the "Fund distribution" accordion; Change value to 80 in the Fiscal year 1 card; Click "Save & close" button',
      );
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.selectFundFromOpenDropdown(fundA.name, fundA.code);
      OrderLineEditForm.selectExpenseClass(expenseClass.name, 0);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 80,
        rowIndex: 0,
      });
      triggerValidation();

      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      OrderLineDetails.waitLoading();

      OrderLineDetails.checkFundDistibutionTableContent([
        { name: fundA.name, expenseClass: expenseClass.name },
      ]);
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

      cy.log(
        'Step 9. Click left back arrow; Click "Actions" button in "PO lines" accordion; Select "Add PO line" option',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();

      cy.log(
        'Step 10. Check "Multi-year prepayment" checkbox; Fill in required fields; Select current FY in "Starting fiscal year" dropdown; Remove all FY cards; Click "Save & close" button',
      );
      OrderLineEditForm.enableMultiYearPrepayment();
      OrderLineEditForm.fillItemDetails({ title: testData.secondPolTitle });
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
      });
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '100', quantityPhysical: '1' });
      OrderLineEditForm.fillPrepaymentTotalPrice(100);
      OrderLineEditForm.selectStartingFiscalYear(fy1.code);

      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      OrderLineEditForm.scrollToPaymentTermsSection();
      OrderLineEditForm.removeLastFYCard();
      OrderLineEditForm.removeLastFYCard();
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: false });
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkAtLeastTwoFYsValidationError();

      cy.log(
        'Step 11. Add two FY cards; Click "Add fund distribution" in FY1 card; Select Fund A; Select expense class; Change type to %; Click "Save & close"',
      );
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.addFundDistributionInFYCard(fy1.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy1.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      triggerValidation();
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy1.code,
        expenseClassName: expenseClass.name,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy1.code });
      triggerValidation();

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

      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();

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

      cy.log(
        'Step 12. Click "Actions" button on the "Orders" pane; Select "Export results (CSV)" option; Leave "All" selected; Click "Export" button',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.waitLoading();
      Orders.exportResultsToCsv();

      cy.log('Step 13. Open downloaded .csv file');
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
    },
  );
});
