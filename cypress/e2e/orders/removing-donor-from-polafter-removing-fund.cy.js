import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
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

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
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
  const allocatedQuantity = '100';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    Organizations.createOrganizationViaApi(firstOrganization).then((responseFirstOrganization) => {
      firstOrganization.id = responseFirstOrganization;
      Organizations.createOrganizationViaApi(secondOrganization).then(
        (responseSecondOrganization) => {
          secondOrganization.id = responseSecondOrganization;
          FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
            firstFiscalYear.id = firstFiscalYearResponse.id;
            defaultLedger.fiscalYearOneId = firstFiscalYear.id;
            Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
              defaultLedger.id = ledgerResponse.id;
              defaultFund.ledgerId = defaultLedger.id;
              defaultFund.donorOrganizationIds = [firstOrganization.id];
              Funds.createViaApi(defaultFund).then((fundResponse) => {
                defaultFund.id = fundResponse.fund.id;

                FinanceHelp.searchByName(defaultFund.name);
                Funds.selectFund(defaultFund.name);
                Funds.addBudget(allocatedQuantity);
              });
            });
          });
        },
      );
    });
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
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.name,
      );
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
    'C423401 Removing donor record from PO line after removing fund distribution (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C423401'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.checkAddDonorButtomisActive();
      OrderLines.addDonorAndCancel(secondOrganization.name);
      OrderLines.deleteFundInPOLwithoutSave();
      OrderLines.deleteDonor(firstOrganization.name);
      OrderLines.saveOrderLine();
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.checkEmptyDonorList();
    },
  );
});
