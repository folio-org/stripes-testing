import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Receiving', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
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
  const thirdOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
    id: uuid(),
  };
  const fourthOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
    id: uuid(),
  };
  const secondOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  let user;
  let firstOrderNumber;
  let secondOrderNumber;
  let servicePointId;
  let location;
  let thirdOrderNumber;
  let fourthOrderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
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
                    // Prepare 2 Open Orders for Rollover
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        secondOrder.vendor = organization.id;
                        firstOrder.vendor = organization.id;
                        thirdOrder.vendor = organization.id;
                        fourthOrder.vendor = organization.id;
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
                          firstOrderNumber = firstOrderResponse.poNumber;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                          OrderLines.createOrderLineViaApi(firstOrderLine);
                        });
                        Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                          secondOrder.id = secondOrderResponse.id;
                          secondOrderNumber = secondOrderResponse.poNumber;
                          secondOrderLine.purchaseOrderId = secondOrderResponse.id;
                          OrderLines.createOrderLineViaApi(secondOrderLine);
                        });
                        cy.loginAsAdmin();
                        TopMenuNavigation.openAppFromDropdown('Orders');
                        Orders.selectOrdersPane();
                        Orders.createOrderViaApi(thirdOrder).then((thirdOrderResponse) => {
                          thirdOrder.id = thirdOrderResponse.id;
                          thirdOrderNumber = thirdOrderResponse.poNumber;
                          Orders.searchByParameter('PO number', thirdOrderNumber);
                          Orders.selectFromResultsList(thirdOrderNumber);
                          OrderLines.addPOLine();
                          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
                          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
                            firstFund,
                            '50',
                            '1',
                            '50',
                            location.name,
                          );
                          OrderLines.backToEditingOrder();
                          Orders.resetFilters();
                        });
                        Orders.createOrderViaApi(fourthOrder).then((fourthOrderResponse) => {
                          fourthOrder.id = fourthOrderResponse.id;
                          fourthOrderNumber = fourthOrderResponse.poNumber;
                          Orders.searchByParameter('PO number', fourthOrderNumber);
                          Orders.selectFromResultsList(fourthOrderNumber);
                          OrderLines.addPOLine();
                          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
                          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
                            firstFund,
                            '50',
                            '1',
                            '50',
                            location.name,
                          );
                          OrderLines.backToEditingOrder();
                          Orders.resetFilters();
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
      permissions.inventoryAll.gui,
      permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp('Receiving');
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C466170 Order line with linked Holdings could be found by "Location" filtering facet on "Receiving" pane (thunderjet) (TaaS)',
    { tags: ['smokeBroken', 'thunderjet', 'C466170'] },
    () => {
      Receiving.clearSearchField();
      Receiving.selectLocationInFilters(location.name);
      Receiving.checkExistingPOLInReceivingList(`${firstOrderNumber}-1`);
      Receiving.checkExistingPOLInReceivingList(`${secondOrderNumber}-1`);
      Receiving.checkExistingPOLInReceivingList(`${thirdOrderNumber}-1`);
      Receiving.checkExistingPOLInReceivingList(`${fourthOrderNumber}-1`);
      Orders.resetFilters();
    },
  );
});
