import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: Organizations', () => {
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
      permissions.uiOrganizationsView.gui,
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsViewEditDelete.gui,
      permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.deleteOrganization();

    cy.visit(SettingsMenu.acquisitionUnitsPath);

    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C350693 Test acquisition unit restrictions for Organization records (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.createOrganizationWithAU(organization, defaultAcquisitionUnit.name);
      Organizations.checkCreatedOrganization(organization);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.unAssignUser(defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkZeroSearchResultsHeader();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.selectViewCheckbox();

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
    },
  );
});
