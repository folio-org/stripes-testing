import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const thirdFund = {
    name: `autotest_fund3_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const thirdBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  const OLTitle = `autotest_title_${getRandomPostfix()}`;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      firstBudget.fiscalYearId = defaultFiscalYearResponse.id;
      secondBudget.fiscalYearId = defaultFiscalYearResponse.id;
      thirdBudget.fiscalYearId = defaultFiscalYearResponse.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;
        thirdFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);

            Funds.createViaApi(thirdFund).then((thirdFundResponse) => {
              thirdFund.id = thirdFundResponse.fund.id;
              thirdBudget.fundId = thirdFundResponse.fund.id;
              Budgets.createViaApi(thirdBudget);

              ServicePoints.getViaApi().then((servicePoint) => {
                servicePointId = servicePoint[0].id;
                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                  (res) => {
                    location = res;

                    MaterialTypes.createMaterialTypeViaApi(
                      MaterialTypes.getDefaultMaterialType(),
                    ).then((mtypes) => {
                      cy.getAcquisitionMethodsApi({
                        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                      }).then((params) => {
                        Organizations.createOrganizationViaApi(organization).then(
                          (responseOrganizations) => {
                            organization.id = responseOrganizations;
                            defaultOrder.vendor = organization.id;
                            const orderLine = {
                              ...BasicOrderLine.defaultOrderLine,
                              titleOrPackage: OLTitle,
                              cost: {
                                listUnitPrice: 50.0,
                                currency: 'USD',
                                discountType: 'percentage',
                                quantityPhysical: 1,
                                poLineEstimatedPrice: 50.0,
                              },
                              fundDistribution: [
                                {
                                  code: firstFund.code,
                                  fundId: firstFund.id,
                                  value: 20.0,
                                  distributionType: 'amount',
                                },
                                {
                                  code: secondFund.code,
                                  fundId: secondFund.id,
                                  value: 15.0,
                                  distributionType: 'amount',
                                },
                                {
                                  code: thirdFund.code,
                                  fundId: thirdFund.id,
                                  value: 15.0,
                                  distributionType: 'amount',
                                },
                              ],
                              locations: [
                                { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                              ],
                              acquisitionMethod: params.body.acquisitionMethods[0].id,
                              physical: {
                                createInventory: 'Instance, Holding, Item',
                                materialType: mtypes.body.id,
                                materialSupplier: responseOrganizations,
                                volumes: [],
                              },
                            };
                            Orders.createOrderViaApi(defaultOrder).then((orderResponse) => {
                              defaultOrder.id = orderResponse.id;
                              orderNumber = orderResponse.poNumber;
                              orderLine.purchaseOrderId = orderResponse.id;

                              OrderLines.createOrderLineViaApi(orderLine);
                              Orders.updateOrderViaApi({
                                ...orderResponse,
                                workflowStatus: ORDER_STATUSES.OPEN,
                              });
                            });
                          },
                        );
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
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C627243 Unopen one-time order with multiple funds in PO line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C627243'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.unOpenOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully unopened`,
      );
      Orders.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderLines.selectPOLInOrder();
      OrderLines.openPageCurrentEncumbranceInFund(`${firstFund.name}(${firstFund.code})`, '$0.00');
      Funds.varifyDetailsInTransactionFundTo(
        defaultFiscalYear.code,
        '($0.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkInitialEncumbranceDetails('$0.00');
      Funds.checkStatusInTransactionDetails(ORDER_STATUSES.PENDING);
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      OrderLines.selectPOLInOrder();
      OrderLines.openInstanceInPOL(OLTitle);
      InventoryInstance.checkHoldingTitle({ title: location.name, absent: true });
    },
  );
});
