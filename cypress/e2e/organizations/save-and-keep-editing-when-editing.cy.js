import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const org = { ...NewOrganization.defaultUiOrganizations, isVendor: false };
  const organizationWithNewName = {
    name: `organization_name_${getRandomPostfix()}`,
  };
  let user;
  let preUpdated;
  let lastUpdated;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(org).then((response) => {
      org.id = response;
    });
    cy.createTempUser([permissions.uiOrganizationsViewEdit.gui]).then((u) => {
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
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(org.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C656335 Save using Save & keep editing when editing organization',
    { tags: ['extendedPath', 'thunderjet', 'C656335'] },
    () => {
      Organizations.searchByParameters('Name', org.name);
      Organizations.selectOrganization(org.name);
      Organizations.getLastUpdateTime().then((time) => {
        preUpdated = time;
      });
      Organizations.editOrganization();
      Organizations.fillNameField('');
      Organizations.saveAndKeepEditing();
      Organizations.checkRequiredFields('Name');
      Organizations.fillNameField(organizationWithNewName.name);
      Organizations.saveAndKeepEditing();
      Organizations.varifySaveOrganizationCalloutMessage(organizationWithNewName);
      cy.wait(3000);
      Organizations.selectVendor();
      Organizations.saveAndKeepEditing();
      Organizations.varifySaveOrganizationCalloutMessage(organizationWithNewName);
      Organizations.selectDonorCheckbox();
      Organizations.cancelOrganization();
      Organizations.closeWithoutSaving();
      Organizations.checkIsaVendor(organizationWithNewName);
      Organizations.checkIsNotaDonor(organizationWithNewName);
      Organizations.getLastUpdateTime().then((time) => {
        lastUpdated = time;
        cy.expect(preUpdated).not.to.equal(lastUpdated);
      });
    },
  );
});
