import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import getRandomPostfix from '../../support/utils/stringTools';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_TYPES,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
      fundC: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
      fundC: {},
    },
    organization: {},
    order: {},
    user: {},
    location: {},
  };

  const polData = {
    itemDetails: {
      title: `autotest_pol_title_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
      orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
    },
    costDetails: {
      electronicUnitPrice: '90',
      quantityElectronic: '1',
    },
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
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

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then((fundAData) => {
          testData.funds.fundA = fundAData.fund;
          testData.budgets.fundA = fundAData.budget;

          return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then(
            (fundBData) => {
              testData.funds.fundB = fundBData.fund;
              testData.budgets.fundB = fundBData.budget;

              return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then(
                (fundCData) => {
                  testData.funds.fundC = fundCData.fund;
                  testData.budgets.fundC = fundCData.budget;
                },
              );
            },
          );
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
      };

      const order = {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        orderType: ORDER_TYPES.ONGOING,
        ongoing: { isSubscription: false, manualRenewal: false },
        approved: true,
        reEncumber: true,
      };

      return Orders.createOrderViaApi(order).then((orderResponse) => {
        testData.order = orderResponse;

        return ServicePoints.getViaApi().then((servicePoint) => {
          return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
            (locationResponse) => {
              testData.location = locationResponse;
            },
          );
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          },
        );
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Object.values(testData.budgets).forEach((budget) => Budgets.deleteViaApi(budget.id));
      Object.values(testData.funds).forEach((fund) => Funds.deleteFundViaApi(fund.id));
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C359009 Correct validation of total "Fund distribution" amount (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C359009'] },
    () => {
      // Step 1: Search for the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 2: Click "Add PO line" button
      OrderLines.addPOLine();

      // Step 3: Fill in order line fields
      OrderLineEditForm.fillOrderLineFields(polData);

      // Step 5: Select Fund A, fill in distribution value, check remaining amount to be distributed
      OrderLines.addFundToPOLWithoutSave(0, testData.funds.fundA, '33.33');
      OrderLineEditForm.checkRemainingAmountToBeDistributed('60.00');

      // Step 6: Select Fund B, fill in distribution value, check remaining amount to be distributed
      OrderLines.addFundToPOLWithoutSave(1, testData.funds.fundB, '33.33');
      OrderLineEditForm.checkPercentageAmountIsEqualTo100();
      OrderLineEditForm.checkRemainingAmountToBeDistributed('30.01');

      // Step 7-8: Select Fund C, fill in distribution value, check remaining amount to be distributed
      OrderLines.addFundToPOLWithoutSave(2, testData.funds.fundC, '30.33');
      OrderLineEditForm.checkPercentageAmountIsEqualTo100();
      OrderLineEditForm.checkRemainingAmountToBeDistributed('2.71');

      // Step 9-10: Add location and quantity
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        electronicQuantity: '1',
      });

      // Step 11: Attempt to save PO line and check warnings
      OrderLines.saveOrderLine();
      OrderLineEditForm.checkPercentageAmountIsEqualTo100();
      OrderLineEditForm.checkRemainingAmountToBeDistributed('2.71');

      // Step 12-13: Adjust distribution value for Fund C, save PO line, verify warnings and fund distribution table
      OrderLineEditForm.setFundDistributionValue('33.34', 2);
      OrderLineEditForm.checkPercentageAmountIsEqualTo100(false);
      OrderLineEditForm.checkRemainingAmountToBeDistributed('0.00');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundA.name,
          expenseClass: '',
          value: '33.33%',
          amount: '$29.99',
          initialEncumbrance: '',
          currentEncumbrance: '',
        },
        {
          name: testData.funds.fundB.name,
          expenseClass: '',
          value: '33.33%',
          amount: '$30.00',
          initialEncumbrance: '',
          currentEncumbrance: '',
        },
        {
          name: testData.funds.fundC.name,
          expenseClass: '',
          value: '33.34%',
          amount: '$30.01',
          initialEncumbrance: '',
          currentEncumbrance: '',
        },
      ]);
    },
  );
});
