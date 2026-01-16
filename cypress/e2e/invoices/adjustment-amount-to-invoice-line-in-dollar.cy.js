import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
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

describe('Invoices', () => {
  const order = { ...NewOrder.defaultOngoingTimeOrder, approved: true, reEncumber: true };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    addresses: [
      {
        addressLine1: '1 Centerpiece Blvd.',
        addressLine2: 'P.O. Box 15550',
        city: 'New Castle',
        stateRegion: 'DE',
        zipCode: '19720-5550',
        country: 'USA',
        isPrimary: true,
        categories: [],
        language: 'English',
      },
    ],
  };
  const firstFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const adjustmentDescription = `test_description${getRandomPostfix()}`;
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };

  let user;
  let servicePointId;
  let location;
  let firstInvoice;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      firstBudget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;

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
                    // Prepare 2 Open Orders for Rollover
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        order.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 30.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 30.0,
                          },
                          fundDistribution: [
                            { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                        Orders.createOrderViaApi(order).then((orderResponse) => {
                          order.id = orderResponse.id;
                          firstOrderLine.purchaseOrderId = orderResponse.id;

                          OrderLines.createOrderLineViaApi(firstOrderLine);
                          Orders.updateOrderViaApi({
                            ...orderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                          Invoices.createInvoiceWithInvoiceLineViaApi({
                            vendorId: organization.id,
                            fiscalYearId: defaultFiscalYear.id,
                            poLineId: firstOrderLine.id,
                            fundDistributions: firstOrderLine.fundDistribution,
                            accountingCode: organization.erpCode,
                            releaseEncumbrance: true,
                            subTotal: 30,
                          }).then((invoiceRescponse) => {
                            firstInvoice = invoiceRescponse;
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
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375998 Approve and pay invoice with added adjustment amount to invoice line (not prorated, related to total as "In addition to") (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375998', 'shiftLeft'] },
    () => {
      Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.addAdjustment(adjustmentDescription, '10', '$', 'In addition to');
      Invoices.approveInvoice();
      Invoices.payInvoice();

      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkPaymentInTransactionDetails(
        2,
        defaultFiscalYear.code,
        firstInvoice.vendorInvoiceNo,
        `${firstFund.name} (${firstFund.code})`,
        '($30.00)',
      );
    },
  );
});
