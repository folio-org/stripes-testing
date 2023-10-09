import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import DateTools from '../../support/utils/dateTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';

describe('orders: export', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
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
    ],
  };
  const integrationName = `FirstIntegrationName${getRandomPostfix()}`;
  const integartionDescription = 'Test Integation descripton1';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  let user;
  let location;
  let servicePointId;
  let orderNumber;
  const UTCTime = DateTools.getUTCDateForScheduling();

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.exportManagerAll.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
      permissions.uiOrganizationsViewEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignAdmin();
      AcquisitionUnits.assignUser(user.username);
    });
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
    cy.visit(TopMenu.organizationsPath);
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformation(
      integrationName,
      integartionDescription,
      vendorEDICodeFor1Integration,
      libraryEDICodeFor1Integration,
      organization.accounts[0].accountNo,
      'Purchase',
      UTCTime,
    );

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 20);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });
  });

  it(
    'C380640: Schedule export job for order with Acquisition unit (thunderjet) (TaaS)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.exportManagerOrganizationsPath,
        waiter: ExportManagerSearchPane.waitLoading,
      });
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.selectExportMethod(integrationName);
      ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);
      ExportManagerSearchPane.rerunJob();
      cy.reload();
      ExportManagerSearchPane.verifyResult('Successful');
      ExportManagerSearchPane.selectJob('Successful');
      ExportManagerSearchPane.verifyJobStatusInDetailView('Successful');
      ExportManagerSearchPane.verifyJobOrganizationInDetailView(organization);
      ExportManagerSearchPane.verifyJobExportMethodInDetailView(integrationName);
    },
  );
});
