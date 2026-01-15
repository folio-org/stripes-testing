import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { ORDER_FORMAT_NAMES } from '../../support/constants';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
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
  let enterUser;
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
        firstFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          ServicePoints.getViaApi().then((servicePoint) => {
            servicePointId = servicePoint[0].id;
            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
              location = res;
              Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
                organization.id = responseOrganizations;
                firstOrder.vendor = organization.id;
                Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                  firstOrder.id = firstOrderResponse.id;
                  firstOrderNumber = firstOrderResponse.poNumber;
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([permissions.uiOrdersEdit.gui, permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        enterUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Budgets.deleteViaApi(firstBudget.id);
    Funds.deleteFundViaApi(firstFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(enterUser.userId);
  });

  it(
    'C468200 Set "Bindery active" flag true when creating a POL with Order format = "P/E Mix" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468200'] },
    () => {
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 2);
      OrderLines.binderyActivePEMixPOLineInfo(
        firstFund,
        ORDER_FORMAT_NAMES.PE_MIX,
        '10',
        '1',
        '20',
        location.name,
      );
      OrderLines.verifyPOLDetailsIsOpened();
      OrderLines.checkBinderyActiveStatus(true);
    },
  );
});
