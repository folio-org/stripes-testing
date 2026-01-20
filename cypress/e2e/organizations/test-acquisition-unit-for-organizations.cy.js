import permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.uiOrganizationsAssignAcquisitionUnitsToNewOrganization.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsView.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsView.gui,
      permissions.uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete.gui,
      permissions.uiOrganizationsManageAcquisitionUnits.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsViewEditDelete.gui,
      permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name=${organization.name}` }).then((response) => {
      Organizations.deleteOrganizationViaApi(response.id);
    });
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
    });
  });

  it(
    'C350693 Test acquisition unit restrictions for Organization records (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C350693'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);
      cy.logout();

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
        authRefresh: true,
      });
      Organizations.createOrganizationWithAU(organization, defaultAcquisitionUnit.name);
      Organizations.checkOrganizationInfo(organization);
      cy.logout();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.unAssignUser(user.username, defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
        authRefresh: true,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkZeroSearchResultsHeader();
      cy.logout();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.selectViewCheckbox();
      cy.logout();

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
        authRefresh: true,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
    },
  );
});
