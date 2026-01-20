import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const org = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((u) => {
      user = u;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    Organizations.searchByParameters('Name', org.name);
    Organizations.selectOrganization(org.name);
    Organizations.deleteOrganization();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C656329 Save using Save & keep editing button when creating new organization',
    { tags: ['extendedPath', 'thunderjet', 'C656329'] },
    () => {
      Organizations.newOrganization();
      Organizations.fillNameField('Name');
      Organizations.saveOrganization();
      Organizations.checkRequiredFields('Code');
      Organizations.checkRequiredFields('Status');
      Organizations.fillInInfoNewOrganization(org);
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(org);
      Organizations.editOrganization();
      Organizations.selectVendor();
      Organizations.saveOrganization();
      Organizations.varifySaveOrganizationCalloutMessage(org);
      Organizations.checkIsaVendor(org);
      Organizations.editOrganization();
      Organizations.selectDonorCheckbox();
      Organizations.cancelOrganization();
      Organizations.closeWithoutSaving();
      Organizations.checkIsNotaDonor(org);
    },
  );
});
