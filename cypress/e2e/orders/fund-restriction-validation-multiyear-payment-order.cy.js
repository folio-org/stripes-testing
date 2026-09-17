import uuid from 'uuid';

import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import { FUND_DISTRIBUTION_TYPES, FUND_STATUSES } from '../../support/constants/finance/fund';
import { LEDGER_STATUSES } from '../../support/constants/finance/ledger';
import { ORDER_STATUSES, ORDER_TYPES } from '../../support/constants/orders/order';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants/orders/order-line';
import { Permissions } from '../../support/dictionary';
import { FinanceHelper } from '../../support/fragments/finance';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MultiYearPaymentTerms from '../../support/fragments/orders/multiYearPaymentTerms';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditFormFragment from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import getRandomStringCode from '../../support/utils/generateTextCode';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };

describe('Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    POL_LIMIT: 'polLimit',
    LOC1: 'loc1',
    LOC2: 'loc2',
    FY1: 'fy1',
    FY2: 'fy2',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    BUDGET_A: 'budgetA',
    BUDGET_B: 'budgetB',
    ORG: 'org',
    ACQ_METHOD: 'acqMethod',
    ORDER: 'order',
    POL: 'pol',
    USER: 'user',
  };

  const PAYMENT_TERMS = {
    TOTAL_PRICE: 100,
    PREPAYMENT_TERM: 2,
    HALF: 50,
    QUARTER: 25,
  };
  const LOCATION_QUANTITY = '1';
  const testData = {
    polTitle: `AT_C1474743_POL_${getRandomPostfix()}`,
    secondPolTitle: `AT_C1474743_SECOND_POL_${getRandomPostfix()}`,
  };

  const locationOption = (location) => `${location.name} (${location.code})`;

  const getPaymentTermsDistributions = ({
    firstYearFundKey = R.FUND_B,
    splitSecondYear = false,
  } = {}) => {
    const { fy1, fy2, fundA, fundB } = flow.ctx();
    const firstYearFund = flow.get(firstYearFundKey);

    return [
      {
        fyCode: fy1.code,
        rows: [
          {
            fundName: firstYearFund.name,
            value: PAYMENT_TERMS.HALF,
            amount: PAYMENT_TERMS.HALF,
          },
        ],
      },
      {
        fyCode: fy2.code,
        rows: splitSecondYear
          ? [
            {
              fundName: fundB.name,
              value: PAYMENT_TERMS.QUARTER,
              amount: PAYMENT_TERMS.QUARTER,
            },
            {
              fundName: fundA.name,
              value: PAYMENT_TERMS.QUARTER,
              amount: PAYMENT_TERMS.QUARTER,
            },
          ]
          : [
            {
              fundName: fundB.name,
              value: PAYMENT_TERMS.HALF,
              amount: PAYMENT_TERMS.HALF,
            },
          ],
      },
    ];
  };

  const assertPaymentTermsOnDetails = ({
    firstYearFundKey = R.FUND_B,
    splitSecondYear = false,
  } = {}) => {
    const { fy1 } = flow.ctx();

    OrderLineDetails.assertMultiYearPrepaymentChecked();
    OrderLineDetails.assertPaymentTerms({
      totalPrice: PAYMENT_TERMS.TOTAL_PRICE,
      prepaymentTerm: PAYMENT_TERMS.PREPAYMENT_TERM,
      startingFiscalYear: fy1.code,
      distributions: getPaymentTermsDistributions({ firstYearFundKey, splitSecondYear }),
    });
  };

  const assertPaymentTermsOnEditForm = ({ splitSecondYear = false } = {}) => {
    const { fy1, fy2, fundA, fundB } = flow.ctx();

    OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
    OrderLineEditForm.assertStartingFiscalYearValue(fy1.code);
    OrderLineEditForm.assertPrepaymentTermValue(PAYMENT_TERMS.PREPAYMENT_TERM);
    OrderLineEditForm.assertFiscalYearCards([fy1.code, fy2.code]);
    OrderLineEditForm.assertFiscalYearCardFundDistributions({
      fyCode: fy1.code,
      distributions: [
        {
          fundName: fundB.name,
          fundCode: fundB.code,
          value: PAYMENT_TERMS.HALF,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
        },
      ],
    });
    OrderLineEditForm.assertFiscalYearCardFundDistributions({
      fyCode: fy2.code,
      distributions: splitSecondYear
        ? [
          {
            fundName: fundB.name,
            fundCode: fundB.code,
            value: PAYMENT_TERMS.QUARTER,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
          },
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            value: PAYMENT_TERMS.QUARTER,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
          },
        ]
        : [
          {
            fundName: fundB.name,
            fundCode: fundB.code,
            value: PAYMENT_TERMS.HALF,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
          },
        ],
    });
  };

  const openOrderLineEditForm = () => {
    OrderLineDetails.openOrderLineEditForm();
    FinanceHelper.waitForGetFiscalYearsRequestCompletion();
  };

  const saveUpdatedOrderLine = ({ restrictionErrorExpected }) => {
    OrderLineEditForm.clickSaveButton();
    OrderLineDetails.waitLoading();

    if (restrictionErrorExpected) {
      OrderLineEditForm.checkFundRestrictionErrorToastPresent();
    } else {
      OrderLineEditForm.checkFundRestrictionErrorToastAbsent();
    }
  };

  before(() => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(R.POL_LIMIT);
    cy.clearLocalStorage();

    flow
      // Precondition 1: Set the purchase order lines limit to a value greater than 1.
      .step((f) => {
        return OrderLinesLimit.getPOLLimit().then((settings) => {
          const initialValue = settings?.[0]?.value || 1;

          return OrderLinesLimit.setPOLLimitViaApi(2).then(() => {
            f.set(R.POL_LIMIT, initialValue);
          });
        });
      })
      // Test data required by Preconditions 4 and 8: create Loc1 and Loc2.
      .step((f) => {
        return ServicePoints.getViaApi().then(([servicePoint]) => {
          return cy.wrap([R.LOC1, R.LOC2]).each((key) => {
            const locationData = NewLocation.getDefaultLocation(
              servicePoint.id,
              `AT_C1474743_${key}_${getRandomPostfix()}`,
            );

            return NewLocation.createViaApi(locationData).then((location) => {
              f.set(key, location, () => NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
                location.institutionId,
                location.campusId,
                location.libraryId,
                location.id,
              ));
            });
          });
        });
      })
      // Precondition 2: Create current FY1 and future FY2 with the same alphabetical series.
      .step((f) => {
        const series = getRandomStringCode(5);

        return cy.wrap([R.FY1, R.FY2]).each((key, index) => {
          return FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(index),
            code: `${series}${new Date().getFullYear() + index}`,
            series,
          }).then((fiscalYear) => {
            f.set(key, fiscalYear, () => FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false));
          });
        });
      })
      // Precondition 3: Create an active Ledger related to FY1.
      .step((f) => {
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: f.get(R.FY1).id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false));
        });
      })
      // Precondition 4: Create active Fund A restricted by location and assign Loc1.
      .step((f) => {
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: f.get(R.LEDGER).id,
          fundStatus: FUND_STATUSES.ACTIVE,
          restrictByLocations: true,
          locations: [{ locationId: f.get(R.LOC1).id }],
        }).then(({ fund }) => {
          f.set(R.FUND_A, fund, () => Funds.deleteFundViaApi(fund.id, false));
        });
      })
      // Precondition 5: Create active Fund B without a location restriction.
      .step((f) => {
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: f.get(R.LEDGER).id,
          fundStatus: FUND_STATUSES.ACTIVE,
          restrictByLocations: false,
          locations: [],
        }).then(({ fund }) => {
          f.set(R.FUND_B, fund, () => Funds.deleteFundViaApi(fund.id, false));
        });
      })
      // Precondition 6: Create current active budgets with allocations for Funds A and B.
      .step((f) => {
        return cy
          .wrap([
            { fundKey: R.FUND_A, budgetKey: R.BUDGET_A },
            { fundKey: R.FUND_B, budgetKey: R.BUDGET_B },
          ])
          .each(({ fundKey, budgetKey }) => {
            return Budgets.createViaApi({
              ...Budgets.getDefaultBudget(),
              fiscalYearId: f.get(R.FY1).id,
              fundId: f.get(fundKey).id,
              allocated: 1000,
              budgetStatus: BUDGET_STATUSES.ACTIVE,
            }).then((budget) => {
              f.set(budgetKey, budget, () => Budgets.deleteViaApi(budget.id, false));
            });
          });
      })
      // Precondition 7: Create the Pending Ongoing order and its configured multi-year PO line.
      .step((f) => {
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization())
          .then((organization) => {
            f.set(R.ORG, organization, () => Organizations.deleteOrganizationViaApi(organization.id));

            return cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
            });
          })
          .then(({ body }) => {
            f.set(R.ACQ_METHOD, body.acquisitionMethods[0]);

            return Orders.createOrderViaApi({
              ...NewOrder.getDefaultOrder({ vendorId: f.get(R.ORG).id }),
              id: uuid(),
              orderType: ORDER_TYPES.ONGOING,
              ongoing: { isSubscription: false, manualRenewal: false },
              workflowStatus: ORDER_STATUSES.PENDING,
            });
          })
          .then((order) => {
            f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false));

            const { fy1, fy2, fundB, loc1, acqMethod } = f.ctx();

            return OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: order.id,
                title: testData.polTitle,
                quantity: 1,
                listUnitPrice: PAYMENT_TERMS.TOTAL_PRICE,
                acquisitionMethod: acqMethod.id,
                orderFormat: ORDER_FORMAT_VALUES.OTHER,
              }),
              fundDistribution: [
                {
                  fundId: fundB.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
              locations: [{ locationId: loc1.id, quantity: 1, quantityPhysical: 1 }],
              multiYearPayment: true,
              paymentTerms: {
                totalPrice: PAYMENT_TERMS.TOTAL_PRICE,
                prepaymentTerm: PAYMENT_TERMS.PREPAYMENT_TERM,
                startingFiscalYearId: fy1.id,
                fiscalYearDistributions: [
                  {
                    fiscalYearId: fy1.id,
                    fundDistributions: [
                      {
                        fundId: fundB.id,
                        distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                        value: PAYMENT_TERMS.HALF,
                      },
                    ],
                  },
                  {
                    fiscalYearId: fy2.id,
                    fundDistributions: [
                      {
                        fundId: fundB.id,
                        distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                        value: PAYMENT_TERMS.HALF,
                      },
                    ],
                  },
                ],
              },
            });
          })
          .then((orderLine) => {
            f.set(R.POL, orderLine);
          });
      })
      // Precondition 8: Make Fund B location-restricted and assign Loc2 after PO-line creation.
      .step((f) => {
        return Funds.updateFundViaApi({
          ...f.get(R.FUND_B),
          restrictByLocations: true,
          locations: [{ locationId: f.get(R.LOC2).id }],
        });
      })
      // Precondition 9: Create a user with only the Orders edit and create capability sets.
      .step((f) => {
        return cy
          .createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui])
          .then((user) => {
            f.set(R.USER, user, () => Users.deleteViaApi(user.userId));
          });
      })
      // Precondition 10: Log in, open Orders, and display the order details pane.
      .step((f) => {
        const { user, order } = f.ctx();

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.selectOrderByPONumber(order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1474743 Fund restriction validation when creating and editing a multiyear payment order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1474743'] },
    () => {
      const { fy1, fy2, fundA, fundB, loc1, loc2, order } = flow.ctx();
      const bothLocationOptions = [locationOption(loc1), locationOption(loc2)];

      FinanceHelper.interceptGetFiscalYearsRequest();

      cy.log('Step 1. Click the PO line in the PO lines accordion');
      OrderDetails.openPolDetails(testData.polTitle);
      // Expected: PO-line details show Fund B, two fiscal-year cards, and the restriction error.
      OrderLineDetails.checkFundDistibutionTableContent([{ name: fundB.code }]);
      assertPaymentTermsOnDetails();
      OrderLineEditForm.checkFundRestrictionErrorToastPresent();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 2. Select Actions > Edit');
      openOrderLineEditForm();
      // Expected: Edit PO line displays Fund B in the top-level and both payment-term distributions.
      OrderLineEditForm.assertFundDistributionFund({
        fundName: fundB.name,
        fundCode: fundB.code,
      });
      assertPaymentTermsOnEditForm();

      cy.log('Step 3. Expand the Location Name (code) dropdown');
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Only Loc1 and Loc2 are offered.
      OrderLineEditForm.checkLocationDropdownOptions(bothLocationOptions);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 4. Remove Fund B from top-level Fund distribution and click Save & close');
      OrderLineEditForm.deleteFundDistribution();

      saveUpdatedOrderLine({ restrictionErrorExpected: true });

      // Expected: Updated PO-line details have blank top-level distribution and two FY cards.
      OrderLineDetails.assertFundDistributionAccordionBlank();
      assertPaymentTermsOnDetails();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 5. Select Actions > Edit');
      openOrderLineEditForm();
      // Expected: Fund B remains selected in both payment-term cards.
      OrderLineEditForm.assertFundDistributionSectionEmpty();
      assertPaymentTermsOnEditForm();

      cy.log('Step 6. Expand the Location Name (code) dropdown');
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Only Loc1 and Loc2 are offered.
      OrderLineEditForm.checkLocationDropdownOptions(bothLocationOptions);

      cy.log('Step 7. Select Loc2 and click Save & close');
      OrderLineEditForm.selectLocationFromDropdown(loc2.name);

      saveUpdatedOrderLine({ restrictionErrorExpected: false });

      // Expected: PO-line details are updated without a location-restriction error.
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: loc2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: LOCATION_QUANTITY },
          ],
        ],
      });

      cy.log('Step 8. Select Actions > Edit');
      openOrderLineEditForm();
      // Expected: Fund B remains in payment terms and only Loc2 is selected in Location.
      assertPaymentTermsOnEditForm();
      OrderLineEditForm.assertSelectedLocation({
        locationName: loc2.name,
        locationCode: loc2.code,
      });

      cy.log('Step 9. Expand Fund ID in the FY1 card');
      OrderLineEditForm.openFundSelectorInPaymentTermsCard({ fyCode: fy1.code });
      // Expected: Fund A is absent because its Loc1 restriction is not satisfied.
      OrderLineEditForm.verifyFundInDropdown(fundA.name, fundA.code, false);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 10. Expand Fund ID in the FY2 card');
      OrderLineEditForm.openFundSelectorInPaymentTermsCard({ fyCode: fy2.code });
      // Expected: Fund A is absent because its Loc1 restriction is not satisfied.
      OrderLineEditForm.verifyFundInDropdown(fundA.name, fundA.code, false);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 11. Add a fund distribution in FY2 and expand its Fund ID dropdown');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.openFundSelectorInPaymentTermsCard({ fyCode: fy2.code, rowIndex: 1 });
      // Expected: Fund A is also absent from a newly added distribution.
      OrderLineEditForm.verifyFundInDropdown(fundA.name, fundA.code, false);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 12. Remove the location and click Add location');
      OrderLineEditForm.removeLocationByIndex();
      OrderLineEditForm.clickAddLocationButton();
      // Expected: A new empty Location row is displayed.
      OrderLineEditForm.checkLocationDetailsSection();

      cy.log('Step 13. Expand the new Location Name (code) dropdown');
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Only Loc2 is available while Fund B is the only selected restricted fund.
      OrderLineEditForm.checkLocationDropdownOptions([locationOption(loc2)]);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 14. Add Fund A to the second fund distribution in the FY2 card');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 1,
      });
      // Expected: FY2 contains both Fund B and Fund A distributions.
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy2.code,
        distributions: [
          { fundName: fundB.name, fundCode: fundB.code, value: PAYMENT_TERMS.HALF },
          { fundName: fundA.name, fundCode: fundA.code, value: 0 },
        ],
      });

      cy.log('Step 15. Expand the Location Name (code) dropdown');
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Loc1 and Loc2 are both available for the two restricted funds.
      OrderLineEditForm.checkLocationDropdownOptions(bothLocationOptions);
      OrderLineEditForm.closeOpenSelection();

      cy.log(
        'Step 16. Add Loc1 and Loc2, adjust quantities and fund distributions, and click Save & close',
      );
      OrderLineEditForm.expandLocationDropdown();
      OrderLineEditForm.selectLocationFromDropdown(loc1.name);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(1);
      OrderLineEditForm.selectLocationFromDropdown(loc2.name);
      OrderLineEditForm.fillCostDetails({ quantityPhysical: '2' });

      OrderLines.setPhysicalQuantity({
        quantity: LOCATION_QUANTITY,
        changeQuantity: false,
      });
      OrderLines.setPhysicalQuantity({
        quantity: LOCATION_QUANTITY,
        index: 1,
        changeQuantity: false,
      });

      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: PAYMENT_TERMS.QUARTER,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: PAYMENT_TERMS.QUARTER,
        rowIndex: 1,
      });

      saveUpdatedOrderLine({ restrictionErrorExpected: false });

      // Expected: Updated details have both locations and two populated payment-term cards.
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: loc1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: LOCATION_QUANTITY },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: loc2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: LOCATION_QUANTITY },
          ],
        ],
      });
      assertPaymentTermsOnDetails({ splitSecondYear: true });

      cy.log('Step 17. Select Actions > Edit');
      openOrderLineEditForm();
      // Expected: Edit PO line is displayed with the saved two-fund payment terms.
      assertPaymentTermsOnEditForm({ splitSecondYear: true });

      cy.log(
        'Step 18. Select Fund A in top-level Fund distribution, remove Loc1, adjust quantity, and save',
      );
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.selectFundFromOpenDropdown(fundA.name, fundA.code);
      OrderLineEditForm.removeLocationByIndex();

      OrderLines.setPhysicalQuantity({ quantity: `${Number(LOCATION_QUANTITY) * 2}` });

      saveUpdatedOrderLine({ restrictionErrorExpected: true });

      // Expected: Fund A is top-level, both FY cards remain, and the restriction error appears.
      OrderLineDetails.checkFundDistibutionTableContent([{ name: fundA.code }]);
      assertPaymentTermsOnDetails({ splitSecondYear: true });
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 19. Select Actions > Edit');
      openOrderLineEditForm();
      // Expected: Edit PO line is displayed with Fund A in top-level distribution.
      OrderLineEditForm.assertFundDistributionFund({
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      assertPaymentTermsOnEditForm({ splitSecondYear: true });

      cy.log('Step 20. Remove Fund A from top-level Fund distribution and click Save & close');
      OrderLineEditForm.deleteFundDistribution();

      saveUpdatedOrderLine({ restrictionErrorExpected: true });

      // Expected: Top-level distribution is blank; payment terms remain and the error persists.
      OrderLineDetails.assertFundDistributionAccordionBlank();
      assertPaymentTermsOnDetails({ splitSecondYear: true });
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 21. Return to the order and select PO lines Actions > Add PO line');
      OrderLineDetails.backToOrderDetails();
      OrderDetails.selectAddPOLine();
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();

      cy.log(
        'Step 22. Enable multi-year prepayment, select FY1 and Fund A, add a location, and expand Name (code)',
      );
      OrderLineEditForm.enableMultiYearPrepayment();
      OrderLineEditForm.fillPrepaymentTotalPrice(PAYMENT_TERMS.TOTAL_PRICE);
      OrderLineEditForm.selectStartingFiscalYear(fy1.code);
      OrderLineEditForm.addFundDistributionInFYCard(fy1.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy1.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy1.code,
        value: PAYMENT_TERMS.HALF,
      });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Only Loc1 is offered for Fund A.
      OrderLineEditForm.checkLocationDropdownOptions([locationOption(loc1)]);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 23. Select Fund B in FY2, add a location, and expand Name (code)');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundB.name,
        fundCode: fundB.code,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: PAYMENT_TERMS.HALF,
      });
      OrderLineEditForm.expandLocationDropdown();
      // Expected: Loc1 and Loc2 are offered for Funds A and B.
      OrderLineEditForm.checkLocationDropdownOptions(bothLocationOptions);
      OrderLineEditForm.closeOpenSelection();

      cy.log('Step 24. Select locations, fill all required fields, and click Save & close');
      OrderLineEditForm.fillItemDetails({ title: testData.secondPolTitle });
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_NAMES.OTHER,
      });
      OrderLineEditForm.fillCostDetails({
        physicalUnitPrice: String(PAYMENT_TERMS.TOTAL_PRICE),
        quantityPhysical: LOCATION_QUANTITY,
      });

      OrderLineEditForm.expandLocationDropdown();
      OrderLineEditForm.selectLocationFromDropdown(loc1.name);
      OrderLines.setPhysicalQuantity({
        quantity: LOCATION_QUANTITY,
        changeQuantity: false,
      });

      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();

      // Expected: Created PO-line details have blank top-level distribution, two FY cards, and an error.
      OrderLineDetails.assertFundDistributionAccordionBlank();
      assertPaymentTermsOnDetails({ firstYearFundKey: R.FUND_A });
      OrderLineEditForm.checkFundRestrictionErrorToastPresent();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 25. Edit the PO line, add Loc2, adjust quantities, and click Save & close');
      openOrderLineEditForm();
      OrderLineEditForm.fillCostDetails({ quantityPhysical: '2' });

      OrderLines.setPhysicalQuantity({ quantity: LOCATION_QUANTITY });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(1);
      OrderLineEditForm.selectLocationFromDropdown(loc2.name);
      OrderLines.setPhysicalQuantity({
        quantity: LOCATION_QUANTITY,
        index: 1,
        changeQuantity: false,
      });

      saveUpdatedOrderLine({ restrictionErrorExpected: false });

      // Expected: Updated details have no restriction error, blank top-level distribution, and two FY cards.
      OrderLineDetails.assertFundDistributionAccordionBlank();
      assertPaymentTermsOnDetails({ firstYearFundKey: R.FUND_A });
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: loc1.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: LOCATION_QUANTITY },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: loc2.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: LOCATION_QUANTITY },
          ],
        ],
      });

      cy.log('Step 26. Return to the order, select Actions > Open, and submit the modal');
      OrderLineDetails.backToOrderDetails();
      // The case starts this step with a Pending order; successful submission transitions it to Open.
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.openOrder({ orderNumber: order.poNumber });
      // Expected: Purchase order details remain displayed and the successful-open toast appears.
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
