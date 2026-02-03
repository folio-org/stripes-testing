import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';

describe('Finance: Transactions', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: true,
    restrictExpenditures: false,
  };
  const firstFund = { ...Funds.defaultUiFund };

  const firstOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };

  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let location;
  let firstOrderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

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
                    firstOrder.vendor = organization.id;
                    OrderLinesLimit.setPOLLimit(3);
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 95,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 95,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                    const thirdOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      id: uuid(),
                      cost: {
                        listUnitPrice: 5.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 5.0,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                      secondOrderLine.purchaseOrderId = firstOrderResponse.id;
                      thirdOrderLine.purchaseOrderId = firstOrderResponse.id;
                      firstOrderNumber = firstOrderResponse.poNumber;

                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      OrderLines.createOrderLineViaApi(secondOrderLine);
                      OrderLines.createOrderLineViaApi(thirdOrderLine);
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
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password);
    });
  });

  after(() => {
    cy.getAdminToken();

    OrderLinesLimit.setPOLLimit(1);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C449366 Order with three PO lines can NOT be opened when encumbered available balance is less that order total (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C449366'] },
    () => {
      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
      Orders.resetFiltersIfActive();
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      Orders.openOrder();
      Orders.checkOrderIsNotOpened(firstFund.code);
      OrderLines.selectPOLInOrder();
      OrderLines.openPageCurrentEncumbrance(`${firstFund.name}(${firstFund.code})`);
      Funds.viewTransactionsForCurrentBudget();
      Funds.checkAbsentTransaction('Encumbrance');
      TopMenuNavigation.navigateToApp('Orders');
      Orders.resetFiltersIfActive();
      OrderLines.selectOrderLineByPolNumber(`${firstOrderNumber}-2`);
      OrderLines.openPageCurrentEncumbrance(`${firstFund.name}(${firstFund.code})`);
      Funds.viewTransactionsForCurrentBudget();
      Funds.checkAbsentTransaction('Encumbrance');
      TopMenuNavigation.navigateToApp('Orders');
      Orders.resetFiltersIfActive();
      OrderLines.selectOrderLineByPolNumber(`${firstOrderNumber}-3`);
      OrderLines.openPageCurrentEncumbrance(`${firstFund.name}(${firstFund.code})`);
      Funds.viewTransactionsForCurrentBudget();
      Funds.checkAbsentTransaction('Encumbrance');
    },
  );
});
