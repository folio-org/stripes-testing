import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('Orders', () => {
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
  const firstOrganization = {
    ...NewOrganization.defaultUiOrganizations,
    isDonor: true,
    isVendor: true,
  };
  const secondOrganization = {
    name: `autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isDonor: true,
    isVendor: false,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(firstOrganization).then((responseFirstOrganization) => {
      firstOrganization.id = responseFirstOrganization;
      Organizations.createOrganizationViaApi(secondOrganization).then(
        (responseSecondOrganization) => {
          secondOrganization.id = responseSecondOrganization;
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
              });
            });
          });
        },
      );
    });
    cy.getAdminToken();
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    defaultOrder.vendor = firstOrganization.name;
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
    Orders.createApprovedOrderForRollover(defaultOrder, true).then((firstOrderResponse) => {
      defaultOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(defaultOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 25);
      OrderLines.openDonorInformationSection();
      OrderLines.addDonor(firstOrganization.name);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.name,
      );
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.addDonor(secondOrganization.name);
      OrderLines.saveOrderLine();
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
  });

  it(
    'C423399 Deleting manually assigned donor from POL while assigned fund exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.deleteDonor(firstOrganization.name);
      OrderLines.saveOrderLine();
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.deleteDonor(secondOrganization.name);
      OrderLines.saveOrderLine();
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.checkEmptyDonorList();
    },
  );
});
