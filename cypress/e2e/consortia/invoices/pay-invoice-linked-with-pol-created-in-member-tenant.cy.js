import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../support/utils/stringTools';
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
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Approvals from '../../../support/fragments/settings/invoices/approvals';

describe('Invoices', () => {
  describe('Consortium (Invoices)', () => {
    const randomPostfix = getRandomPostfix();
    const instancePrefix = `C411683-B Instance ${randomPostfix}`;
    const subjectPrefix = `C411683-B Subject ${randomPostfix}`;
    const testData = {
      collegeHoldings: [],
      universityHoldings: [],
      sharedInstance: {
        title: `${instancePrefix} Shared`,
        subjects: [{ value: `${subjectPrefix} 1` }, { value: `${subjectPrefix} 2` }],
      },
      sharedAccordionName: 'Shared',
      subjectBrowseoption: 'Subjects',
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const firstOrder = {
      id: uuid(),
      vendor: '',
      orderType: 'One-Time',
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const firstBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    let servicePointId;
    let location;
    let firstInvoice;
    let orderNumber;

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInvoicesApproveInvoices.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        Approvals.setApprovePayValue(false);

        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiInvoicesApproveInvoices.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiInvoicesPayInvoices.gui,
          Permissions.uiOrdersView.gui,
        ]);
        FiscalYears.createViaApi(firstFiscalYear)
          .then((firstFiscalYearResponse) => {
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
                              firstOrder.vendor = organization.id;
                              const firstOrderLine = {
                                ...BasicOrderLine.defaultOrderLine,
                                cost: {
                                  listUnitPrice: 10.0,
                                  currency: 'USD',
                                  discountType: 'percentage',
                                  quantityPhysical: 1,
                                  poLineEstimatedPrice: 10.0,
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
                              Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                                firstOrder.id = firstOrderResponse.id;
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
                                  subTotal: 40,
                                }).then((invoiceRescponse) => {
                                  firstInvoice = invoiceRescponse;

                                  Invoices.changeInvoiceStatusViaApi({
                                    invoice: firstInvoice,
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
                TopMenuNavigation.navigateToApp('Invoices');
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
      'C610245: Pay invoice linked with POL created in Member tenant (consortia) (thunderjet)',
      { tags: ['smokeECS', 'thunderjet', 'C610245'] },
      () => {
        Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
        Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
        Invoices.payInvoice();
        Invoices.selectInvoiceLine();
        Invoices.openPOLFromInvoiceLineInCurrentPage(`${orderNumber}-1`);
        OrderLines.openPageCurrentEncumbrance('$0.00');
        Funds.selectTransactionInList('Payment');
        Funds.varifyDetailsInTransaction(
          firstFiscalYear.code,
          '($40.00)',
          firstInvoice.vendorInvoiceNo,
          'Encumbrance',
          `${defaultFund.name} (${defaultFund.code})`,
        );
      },
    );
  });
});
