import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

describe('Orders: Inventory interaction', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
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
                    // Prepare 2 Open Orders for Rollover
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        defaultOrder.vendor = organization.id;
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
                        Orders.createOrderViaApi(defaultOrder).then((firstOrderResponse) => {
                          defaultOrder.id = firstOrderResponse.id;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                          firstOrderNumber = firstOrderResponse.poNumber;
                          defaultOrder.poNumber = firstOrderResponse.poNumber;
                          OrderLines.createOrderLineViaApi(firstOrderLine);
                          Orders.updateOrderViaApi({
                            ...firstOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
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
    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
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

    Orders.updateOrderViaApi({
      ...defaultOrder,
      workflowStatus: ORDER_STATUSES.PENDING,
    });
    cy.wait(2000);

    OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${defaultOrder.poNumber}*"` }).then(
      (orderLines) => {
        OrderLines.deleteOrderLineViaApi(orderLines[0].id);
      },
    );
    Orders.deleteOrderViaApi(defaultOrder.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    cy.wait(2000);

    Budgets.deleteViaApi(firstBudget.id);

    Funds.deleteFundViaApi(defaultFund.id);

    Ledgers.deleteledgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C367948: "Inventory: Create order from instance" permission does not grant delete POL permission (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      Orders.deleteButtonInOrderIsAbsent();
      OrderLines.selectPOLInOrder();
      OrderLines.deleteButtonInOrderLineIsAbsent();
      cy.loginAsAdmin({
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByKeywords(user.username);
      UsersSearchPane.openUser(user.username);
      UserEdit.openEdit();
      UserEdit.openSelectPermissionsModal();
      UserEdit.searchForPermission(permissions.uiInventoryCreateOrderFromInstance.gui);
      UserEdit.selectFirsPermissionInSearch();
      UserEdit.savePermissionsInModal();
      UserEdit.saveUserEditForm();
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      Orders.deleteButtonInOrderIsAbsent();
      OrderLines.selectPOLInOrder();
      OrderLines.deleteButtonInOrderLineIsAbsent();
    },
  );
});
