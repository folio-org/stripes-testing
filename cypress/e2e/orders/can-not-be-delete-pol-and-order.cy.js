import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('Orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    reEncumber: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  let orderNumber;
  let user;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
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
                    order.vendor = organization.id;
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 100.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 100.0,
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
                    Orders.createOrderViaApi(order).then((firstOrderResponse) => {
                      order.id = firstOrderResponse.id;
                      orderNumber = firstOrderResponse.poNumber;
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
                        subTotal: 100,
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
      permissions.uiOrdersView.gui,
      permissions.uiOrdersDelete.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
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
    'C375962 Order (line) linked to Invoice can not be deleted (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375962'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.deleteOrderViaActions();
      Orders.checkDeletedErrorMassage();
      OrderLines.selectPOLInOrder(0);
      OrderLines.deleteOrderLine();
      Orders.checkDeletedErrorMassage();
    },
  );
});
