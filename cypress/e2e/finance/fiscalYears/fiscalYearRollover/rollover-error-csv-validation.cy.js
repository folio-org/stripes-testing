import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Orders from '../../../../support/fragments/orders/orders';
import Users from '../../../../support/fragments/users/users';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';
import Organizations from '../../../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    let user;
    const fiscalYear1 = { ...FiscalYears.defaultUiFiscalYear };
    const fiscalYear2 = {
      name: `autotest_year_${getRandomPostfix()}`,
      code: DateTools.getRandomFiscalYearCode(2000, 9999),
      periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
      series: 'FY',
    };
    const ledger = { ...Ledgers.defaultUiLedger };
    const fundA = { ...Funds.defaultUiFund };
    const budget = { ...Budgets.getDefaultBudget(), allocated: 100 };
    const order = {
      id: uuid(),
      orderType: 'One-Time',
      reEncumber: true,
      approved: true,
    };
    let location;
    let orderPOL;
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const todayDate = DateTools.getCurrentDate();
    const fileNameDate = DateTools.getCurrentDateForFileNaming();

    before('Setup data', () => {
      cy.getAdminToken();

      FiscalYears.createViaApi(fiscalYear1).then((fy1) => {
        fiscalYear1.id = fy1.id;
        ledger.fiscalYearOneId = fy1.id;
        budget.fiscalYearId = fy1.id;
        fiscalYear2.code = fiscalYear1.code.slice(0, -1) + '2';
        FiscalYears.createViaApi(fiscalYear2).then((fy2) => {
          fiscalYear2.id = fy2.id;
          Ledgers.createViaApi(ledger).then((ledgerResponse) => {
            ledger.id = ledgerResponse.id;
            fundA.ledgerId = ledgerResponse.id;
            Funds.createViaApi(fundA).then((fundResponse) => {
              fundA.id = fundResponse.fund.id;
              fundA.code = fundResponse.fund.code;
              budget.fundId = fundResponse.fund.id;
              Budgets.createViaApi(budget);

              cy.getLocations({ limit: 1 }).then((res) => {
                location = res;
                cy.getDefaultMaterialType().then((mtype) => {
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
                            {
                              code: fundA.code,
                              fundId: fundA.id,
                              value: 10,
                              distributionType: 'amount',
                            },
                          ],
                          locations: [
                            { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                          ],
                          acquisitionMethod: params.body.acquisitionMethods[0].id,
                          physical: {
                            createInventory: 'Instance, Holding, Item',
                            materialType: mtype.id,
                            materialSupplier: responseOrganizations,
                            volumes: [],
                          },
                        };

                        Orders.createOrderViaApi(order).then((orderResponse) => {
                          order.id = orderResponse.id;
                          orderLine.purchaseOrderId = orderResponse.id;

                          OrderLines.createOrderLineViaApi(orderLine).then((response) => {
                            orderPOL = response;
                          });
                          Orders.updateOrderViaApi({
                            ...orderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
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
      });

      cy.createTempUser([
        permissions.uiFinanceExecuteFiscalYearRollover.gui,
        permissions.uiFinanceViewFiscalYear.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitLoading,
        });
      });
    });

    after('Clean up', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C399078 All fields in rollover error .csv file have correct values (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C399078'] },
      () => {
        const fieldsToCheck = {
          errorType: 'Order',
          failedAction: 'Create encumbrance',
          errorMessage: 'Insufficient funds',
          amount: '10',
          fundId: fundA.id,
          fundCode: fundA.code,
          orderId: order.id,
          orderLineNumber: orderPOL.poLineNumber,
          orderLineId: orderPOL.id,
        };

        Ledgers.searchByName(ledger.name);
        Ledgers.selectLedger(ledger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutAllocation(
          fiscalYear2.code,
          'None',
          'Allocation',
          true,
          true, // isTestRollover
        ).then((ledgerRolloverId) => {
          Ledgers.rolloverLogs();
          Ledgers.exportRolloverError(todayDate);

          Ledgers.checkDownloadedErrorFile({
            ...fieldsToCheck,
            ledgerRolloverId,
            fileName: `${fileNameDate}-error.csv`,
          });
          Ledgers.deleteDownloadedFile(`${fileNameDate}-error.csv`);
          Ledgers.closeOpenedPage();
          Ledgers.rollover();
          Ledgers.fillInCommonRolloverInfoWithoutAllocation(
            fiscalYear2.code,
            'None',
            'Allocation',
            true,
            false, // isTestRollover
          ).then((secondLedgerRolloverId) => {
            Ledgers.clickRolloverErrorsCsv(ledger.name, fiscalYear2.code);
            Ledgers.checkDownloadedErrorFile({
              ...fieldsToCheck,
              ledgerRolloverId: secondLedgerRolloverId,
              fileName: `${ledger.name}-rollover-errors-${fiscalYear2.code}.csv`,
            });
            Ledgers.deleteDownloadedFile(`${ledger.name}-rollover-errors-${fiscalYear2.code}.csv`);
          });
        });
      },
    );
  });
});
