import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import OrderLines from '../../support/fragments/orders/orderLines';

describe('Receiving', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const routingList1 = `routingList_1${getRandomPostfix()}`;
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;
  let secondUser;
  let thirdUser;
  let fourthUser;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          ServicePoints.getViaApi().then((servicePoint) => {
            servicePointId = servicePoint[0].id;
            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
              location = res;

              MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
                (mtypes) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((params) => {
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        firstOrder.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 100.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 2,
                            poLineEstimatedPrice: 100.0,
                          },
                          fundDistribution: [
                            { code: firstFund.code, fundId: firstFund.id, value: 100 },
                          ],
                          locations: [
                            { locationId: location.id, quantity: 2, quantityPhysical: 2 },
                          ],
                          acquisitionMethod: params.body.acquisitionMethods[0].id,
                          physical: {
                            createInventory: 'Instance, Holding, Item',
                            materialType: mtypes.body.id,
                            materialSupplier: responseOrganizations,
                            volumes: [],
                          },
                        };
                        Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                          firstOrder.id = firstOrderResponse.id;
                          firstOrderNumber = firstOrderResponse.poNumber;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                          OrderLines.createOrderLineViaApi(firstOrderLine);
                          Orders.updateOrderViaApi({
                            ...firstOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                          cy.loginAsAdmin({
                            path: TopMenu.ordersPath,
                            waiter: Orders.waitLoading,
                          });
                          Orders.searchByParameter('PO number', firstOrderNumber);
                          Orders.selectFromResultsList(firstOrderNumber);
                          OrderLines.selectPOLInOrder();
                          OrderLines.openRoutingLists();
                          OrderLines.addRoutingList();
                          OrderLines.fillInRoutingListInfoAndSave(routingList1);
                          OrderLines.varifyAddingRoutingList(routingList1);
                        });
                      },
                    );
                  });
                },
              );
            });
          });
        });
      });
    });
    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((secondUserProperties) => {
      secondUser = secondUserProperties;
    });
    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((thirdUserProperties) => {
      thirdUser = thirdUserProperties;
    });
    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((fourthUserProperties) => {
      fourthUser = fourthUserProperties;
    });
    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
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
    Users.deleteViaApi(secondUser.userId);
    Users.deleteViaApi(thirdUser.userId);
    Users.deleteViaApi(fourthUser.userId);
  });

  it(
    'C471488 Users added to Routing list from POL are synchronized with users added via Receiving title (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C471488'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.openRoutingLists();
      OrderLines.openRoutingList(routingList1);
      OrderLines.editRoutingList();
      OrderLines.addUserToRoutingList();
      OrderLines.assignUser(user.username);
      OrderLines.checkUserIsAdded(user.username);
      OrderLines.addUserToRoutingList();
      OrderLines.assignUser(secondUser.username);
      OrderLines.checkUserIsAdded(secondUser.username);
      OrderLines.saveOrderLine();
      OrderLines.editRoutingList();
      OrderLines.checkUserIsAdded(user.username);
      OrderLines.checkUserIsAdded(secondUser.username);
      OrderLines.deleteUserFromRoutingList(secondUser.userId);
      OrderLines.addUserToRoutingList();
      OrderLines.assignUser(thirdUser.username);
      OrderLines.checkUserIsAdded(thirdUser.username);
      OrderLines.addUserToRoutingList();
      OrderLines.assignUser(fourthUser.username);
      OrderLines.checkUserIsAdded(fourthUser.username);
      OrderLines.saveOrderLine();
      OrderLines.checkUserIsAbsent(secondUser.username);
    },
  );
});
