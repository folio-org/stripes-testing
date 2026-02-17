import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const orderForFirstOrganization = { ...NewOrder.defaultOneTimeOrder };
      const orderForSecondOrganization = {
        id: uuid(),
        vendor: '',
        orderType: 'One-Time',
      };

      const firstOrganization = {
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
      const secondOrganization = {
        name: `autotest_name_${getRandomPostfix()}`,
        status: 'Active',
        code: `autotest_code_${getRandomPostfix()}`,
        isVendor: true,
        erpCode: `ERP-${getRandomPostfix()}`,
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
      const integrationNameForFirstOrganization = `FirstIntegrationName${getRandomPostfix()}`;
      const integrationNameForSecondOrganization = `SecondIntegrationName${getRandomPostfix()}`;
      const integartionDescription1 = 'Test Integation descripton1';
      const integartionDescription2 = 'Test Integation descripton2';
      const vendorEDICodeFor1Integration = getRandomPostfix();
      const libraryEDICodeFor1Integration = getRandomPostfix();
      const vendorEDICodeFor2Integration = getRandomPostfix();
      const libraryEDICodeFor2Integration = getRandomPostfix();
      let user;
      let location;
      let servicePointId;
      const UTCTime = DateTools.getUTCDateForScheduling();
      const UTCTimeForSecond = DateTools.getUTCDateFor2Scheduling();

      before(() => {
        cy.getAdminToken();

        ServicePoints.getViaApi().then((servicePoint) => {
          servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
            location = res;
          });
        });

        Organizations.createOrganizationViaApi(firstOrganization).then((organizationsResponse) => {
          firstOrganization.id = organizationsResponse;
          orderForFirstOrganization.vendor = firstOrganization.name;
          orderForFirstOrganization.orderType = 'One-time';

          cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
          OrganizationsSearchAndFilter.searchByParameters('Name', firstOrganization.name);
          Organizations.checkSearchResults(firstOrganization);
          Organizations.selectOrganization(firstOrganization.name);
          Organizations.addIntegration();
          Organizations.fillIntegrationInformation(
            integrationNameForFirstOrganization,
            integartionDescription1,
            vendorEDICodeFor1Integration,
            libraryEDICodeFor1Integration,
            firstOrganization.accounts[0].accountNo,
            'Purchase',
            UTCTime,
          );

          Organizations.createOrganizationViaApi(secondOrganization).then(
            (secondOrganizationsResponse) => {
              secondOrganization.id = secondOrganizationsResponse;
              orderForSecondOrganization.vendor = secondOrganization.name;
              orderForSecondOrganization.orderType = 'One-time';

              cy.visit(TopMenu.organizationsPath);
              OrganizationsSearchAndFilter.searchByParameters('Name', secondOrganization.name);
              Organizations.checkSearchResults(secondOrganization);
              Organizations.selectOrganization(secondOrganization.name);
              Organizations.addIntegration();
              Organizations.fillIntegrationInformation(
                integrationNameForSecondOrganization,
                integartionDescription2,
                vendorEDICodeFor2Integration,
                libraryEDICodeFor2Integration,
                secondOrganization.accounts[0].accountNo,
                'Purchase',
                UTCTimeForSecond,
              );

              cy.visit(TopMenu.ordersPath);
              Orders.createOrder(orderForSecondOrganization, true, false).then((secondOrderId) => {
                orderForSecondOrganization.id = secondOrderId;
                Orders.createPOLineViaActions();
                OrderLines.selectRandomInstanceInTitleLookUP('*', 3);
                OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
                OrderLines.backToEditingOrder();
              });
            },
          );

          cy.visit(TopMenu.ordersPath);
          Orders.createOrder(orderForFirstOrganization, true, false).then((firstOrderId) => {
            orderForFirstOrganization.id = firstOrderId;
            Orders.createPOLineViaActions();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
            OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
            OrderLines.backToEditingOrder();
          });
        });

        cy.createTempUser([permissions.exportManagerAll.gui]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.exportManagerOrganizationsPath,
            waiter: ExportManagerSearchPane.waitLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(orderForFirstOrganization.id);
        Orders.deleteOrderViaApi(orderForSecondOrganization.id);
        Organizations.deleteOrganizationViaApi(firstOrganization.id);
        Organizations.deleteOrganizationViaApi(secondOrganization.id);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C377045 Sorting by export method does not reset search results (thunderjet) (TaaS)',
        { tags: ['extendedPathFlaky', 'thunderjet', 'C377045'] },
        () => {
          ExportManagerSearchPane.selectOrganizationsSearch();
          ExportManagerSearchPane.searchBySuccessful();
          ExportManagerSearchPane.searchByFailed();
          ExportManagerSearchPane.sortByJobID();
          ExportManagerSearchPane.selectJobByIntegrationInList(integrationNameForFirstOrganization);
          ExportManagerSearchPane.resetAll();
          ExportManagerSearchPane.searchBySuccessful();
          ExportManagerSearchPane.searchByFailed();
          ExportManagerSearchPane.sortByJobID();
          ExportManagerSearchPane.selectJobByIntegrationInList(
            integrationNameForSecondOrganization,
          );
        },
      );
    });
  });
});
