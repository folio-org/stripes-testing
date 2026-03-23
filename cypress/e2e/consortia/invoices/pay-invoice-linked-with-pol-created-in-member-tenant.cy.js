import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Approvals from '../../../support/fragments/settings/invoices/approvals';

describe('Invoices', () => {
  describe('Consortium (Invoices)', () => {
    const testData = {
      user: {},
    };
    const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const ledger = { ...Ledgers.defaultUiLedger };
    const fund = { ...Funds.defaultUiFund };
    const budget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const order = {
      id: uuid(),
      vendor: '',
      orderType: 'One-Time',
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    let servicePointId;
    let location;
    let invoice;
    let orderNumber;

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInvoicesApproveInvoices.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        Approvals.setApprovePayValueViaApi(false);

        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesApproveInvoices.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiInvoicesPayInvoices.gui,
          Permissions.uiOrdersView.gui,
        ]);
        FiscalYears.createViaApi(fiscalYear)
          .then((firstFiscalYearResponse) => {
            fiscalYear.id = firstFiscalYearResponse.id;
            budget.fiscalYearId = firstFiscalYearResponse.id;
            ledger.fiscalYearOneId = fiscalYear.id;
            Ledgers.createViaApi(ledger).then((ledgerResponse) => {
              ledger.id = ledgerResponse.id;
              fund.ledgerId = ledger.id;

              Funds.createViaApi(fund).then((fundResponse) => {
                fund.id = fundResponse.fund.id;
                budget.fundId = fundResponse.fund.id;
                Budgets.createViaApi(budget);
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
                              order.vendor = organization.id;
                              const orderLine = {
                                ...BasicOrderLine.defaultOrderLine,
                                cost: {
                                  listUnitPrice: 10.0,
                                  currency: 'USD',
                                  discountType: 'percentage',
                                  quantityPhysical: 1,
                                  poLineEstimatedPrice: 10.0,
                                },
                                fundDistribution: [
                                  { code: fund.code, fundId: fund.id, value: 100 },
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
                                orderNumber = orderResponse.poNumber;
                                orderLine.purchaseOrderId = orderResponse.id;

                                OrderLines.createOrderLineViaApi(orderLine);
                                Orders.updateOrderViaApi({
                                  ...orderResponse,
                                  workflowStatus: ORDER_STATUSES.OPEN,
                                });
                                Invoices.createInvoiceWithInvoiceLineViaApi({
                                  vendorId: organization.id,
                                  fiscalYearId: fiscalYear.id,
                                  poLineId: orderLine.id,
                                  fundDistributions: orderLine.fundDistribution,
                                  accountingCode: organization.erpCode,
                                  releaseEncumbrance: true,
                                  subTotal: 40,
                                }).then((invoiceRescponse) => {
                                  invoice = invoiceRescponse;

                                  Invoices.changeInvoiceStatusViaApi({
                                    invoice,
                                    status: INVOICE_STATUSES.APPROVED,
                                  });
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
          })
          .then(() => {
            cy.resetTenant();
            cy.login(testData.userProperties.username, testData.userProperties.password).then(
              () => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
              },
            );
          });
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C610245 Pay invoice linked with POL created in Member tenant (consortia) (thunderjet)',
      { tags: ['smokeECS', 'thunderjet', 'C610245'] },
      () => {
        Invoices.searchByNumber(invoice.vendorInvoiceNo);
        Invoices.selectInvoice(invoice.vendorInvoiceNo);
        Invoices.payInvoice();
        Invoices.selectInvoiceLine();
        Invoices.openPOLFromInvoiceLineInCurrentPage(`${orderNumber}-1`);
        OrderLines.openPageCurrentEncumbrance('$0.00');
        Funds.selectTransactionInList('Payment');
        Funds.varifyDetailsInTransaction(
          fiscalYear.code,
          '($40.00)',
          invoice.vendorInvoiceNo,
          'Encumbrance',
          `${fund.name} (${fund.code})`,
        );
      },
    );
  });
});
