import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import DateTools from '../../../support/utils/dateTools';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
    };
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
      ],
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
    let secondUser;
    let location;
    let servicePointId;
    let orderNumber;
    const UTCTime = DateTools.getUTCDateForScheduling();

    before(() => {
      cy.getAdminToken();

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;
        });
      });
      Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
        organization.id = organizationsResponse;
        order.vendor = organizationsResponse;
      });
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.addIntegration();
      Organizations.fillIntegrationInformation(
        integrationName1,
        integartionDescription1,
        vendorEDICodeFor1Integration,
        libraryEDICodeFor1Integration,
        organization.accounts[0].accountNo,
        'Purchase',
        UTCTime,
      );
      Organizations.addIntegration();
      cy.wait(2000);
      Organizations.fillIntegrationInformation(
        integrationName2,
        integartionDescription2,
        vendorEDICodeFor2Integration,
        libraryEDICodeFor2Integration,
        organization.accounts[1].accountNo,
        'Purchase At Vendor System',
        UTCTime,
      );

      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        // Need to wait while first job will be runing
        cy.wait(70000);
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
        OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        cy.visit(TopMenu.exportManagerOrganizationsPath);
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(integrationName1);
        ExportManagerSearchPane.selectJobByIntegrationInList(integrationName1);
        ExportManagerSearchPane.rerunJob();
        cy.reload();
        ExportManagerSearchPane.verifyResult('Successful');
      });

      cy.createTempUser([permissions.exportManagerView.gui]).then((userProperties) => {
        secondUser = userProperties;
      });

      cy.createTempUser([
        permissions.uiOrdersView.gui,
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersEdit.gui,
        permissions.uiOrdersApprovePurchaseOrders.gui,
        permissions.uiOrganizationsViewEditCreate.gui,
        permissions.uiOrganizationsView.gui,
        permissions.uiExportOrders.gui,
        permissions.exportManagerAll.gui,
        permissions.exportManagerDownloadAndResendFiles.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.exportManagerOrganizationsPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
    });

    after(() => {
      cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.unOpenOrder();
      // Need to wait until the order is opened before deleting it
      cy.wait(2000);
      Orders.deleteOrderViaApi(order.id);

      Organizations.deleteOrganizationViaApi(organization.id);
      NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
        location.institutionId,
        location.campusId,
        location.libraryId,
        location.id,
      );
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C365123: Downloading the exact ".edi" file that was exported for a given export job with "Successful" status (thunderjet)',
      { tags: [TestTypes.smoke, devTeams.thunderjet] },
      () => {
        cy.visit(TopMenu.exportManagerOrganizationsPath);
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(integrationName1);
        ExportManagerSearchPane.verifyResult('Successful');
        ExportManagerSearchPane.selectJob('Successful');
        ExportManagerSearchPane.downloadJob();
        ExportManagerSearchPane.resetAll();
      },
    );

    it(
      'C405555 Verify that User is able to see the executed jobs but not to download the files with View permissions (firebird)',
      { tags: [TestTypes.smoke, devTeams.firebird] },
      () => {
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
        ExportManagerSearchPane.waitLoading();
        ExportManagerSearchPane.searchByAuthorityControl();
        ExportManagerSearchPane.searchByBursar();
        ExportManagerSearchPane.searchByCirculationLog();
        ExportManagerSearchPane.searchByEHoldings();
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.searchByEdifactOrders();
        ExportManagerSearchPane.searchBySuccessful();
        ExportManagerSearchPane.selectSearchResultItem();
        ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();

        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.searchBySuccessful();
        ExportManagerSearchPane.searchByInProgress();
        ExportManagerSearchPane.searchByScheduled();
        ExportManagerSearchPane.searchByFailed();

        ExportManagerSearchPane.searchByInProgress();
        ExportManagerSearchPane.searchByScheduled();
        ExportManagerSearchPane.searchByFailed();
        ExportManagerSearchPane.selectJob(integrationName1);
        ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
        ExportDetails.verifyJobLabels();
      },
    );
  });
});
