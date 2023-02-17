import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Institutions from '../../support/fragments/settings/tenant/institutions';
import Campuses from '../../support/fragments/settings/tenant/campuses';
import Libraries from '../../support/fragments/settings/tenant/libraries';
import DateTools from '../../support/utils/dateTools';

describe('orders: export', () => {
  
  // Test will be failed with issue https://issues.folio.org/browse/STCOM-1120
  
  const order = { ...NewOrder.defaultOneTimeOrder };
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
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout2',
        notes: '',
        paymentMethod: 'Cash',
      },
    ]
  };
  const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
  const integrationName2 = `SecondIntegrationName${getRandomPostfix()}`;
  const integartionDescription1 = 'Test Integation descripton1';
  const integartionDescription2 = 'Test Integation descripton2';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  const vendorEDICodeFor2Integration = getRandomPostfix();
  const libraryEDICodeFor2Integration = getRandomPostfix();
  let user;
  let location;
  let servicePointId;
  let institutionId;
  let campusId;
  let libraryId;
  let institutionName;
  const UTCTime = DateTools.getUTCDateForScheduling();

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi()
        .then((servicePoint) => {
            servicePointId = servicePoint[0].id;
            Institutions.createViaApi(Institutions.getDefaultInstitutions())
                .then(institutionsResponse => {
                    institutionId = institutionsResponse.id;
                    institutionName = institutionsResponse.name;
                    Campuses.createViaApi({ ...Campuses.getDefaultCampuse(), institutionId })
                        .then(campusesResponse => {
                            campusId = campusesResponse.id;
                            Libraries.createViaApi({ ...Libraries.getDefaultLibrary(), campusId })
                                .then(librariesResponse => {
                                    libraryId = librariesResponse.id;
                                    NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId,institutionId,campusId,libraryId))
                                        .then(locationResponse => {
                                            location = locationResponse;
                                        });
                                });
                        });
                });
        });

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = organization.name;
        order.orderType = 'One-time';
      });
    cy.loginAsAdmin({ path:TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformation(integrationName1, integartionDescription1, vendorEDICodeFor1Integration, libraryEDICodeFor1Integration, organization.accounts[0].accountNo, 'Purchase', UTCTime);
    Organizations.addIntegration();
    cy.wait(2000);
    Organizations.fillIntegrationInformation(integrationName2, integartionDescription2, vendorEDICodeFor2Integration, libraryEDICodeFor2Integration, organization.accounts[1].accountNo, 'Purchase At Vendor System', UTCTime);

    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui, 
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.viewEditCreateOrganization.gui, 
      permissions.viewOrganization.gui,
      permissions.uiExportOrders.gui,
      permissions.exportManagerAll.gui,
      permissions.exportManagerDownloadAndResendFiles.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });

  after(() => {
    Orders.deleteOrderApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
        location.institutionId,
        location.campusId,
        location.libraryId,
        location.id
      );
    Users.deleteViaApi(user.userId);
  });

  it('C350402: Verify that an Order is exported to a definite Vendors Account specified in one of several Integration configurations', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.ordersPath);
    Orders.createOrder(order, true, false).then(orderId => {
      order.id = orderId;
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 3);
      OrderLines.fillInPOLineInfoForExportWithLocation(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', institutionName);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });
    cy.visit(TopMenu.exportManagerOrganizationsPath);
    ExportManagerSearchPane.selectOrganizationsSearch();
    ExportManagerSearchPane.selectExportMethod(integrationName1);
    ExportManagerSearchPane.selectSearchResultItem();
    ExportManagerSearchPane.rerunJob();
    cy.reload();
    ExportManagerSearchPane.verifyResult('Successful');
    ExportManagerSearchPane.downloadJob();
    ExportManagerSearchPane.resetAll();
    ExportManagerSearchPane.selectOrganizationsSearch();
    ExportManagerSearchPane.selectExportMethod(integrationName2);
    ExportManagerSearchPane.selectSearchResultItem();
    ExportManagerSearchPane.rerunJob();
    cy.reload();
    ExportManagerSearchPane.verifyResult('Failed');
  });
});
