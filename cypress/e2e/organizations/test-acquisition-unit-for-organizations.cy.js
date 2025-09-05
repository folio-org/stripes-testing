import permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('ui-organizations: Organizations', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
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
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    }, 20_000);
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
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
      }, 20_000);
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);
      cy.logout();
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      }, 20_000);
      Organizations.createOrganizationWithAU(organization, defaultAcquisitionUnit.name);
      Organizations.checkOrganizationInfo(organization);
      cy.logout();

      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
      }, 20_000);
      AcquisitionUnits.unAssignUser(user.username, defaultAcquisitionUnit.name);

      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      }, 20_000);
      Organizations.searchByParameters('Name', organization.name);
      Organizations.checkZeroSearchResultsHeader();
      cy.logout();

      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
      }, 20_000);
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.selectViewCheckbox();
      cy.logout();

      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      }, 20_000);
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
    },
  );
});
