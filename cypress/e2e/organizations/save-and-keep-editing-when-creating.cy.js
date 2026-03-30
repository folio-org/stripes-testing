import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const org = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.createTempUser([Permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: `name="${org.name}"` }).then((organization) => {
      Organizations.deleteOrganizationViaApi(organization.id);
    });
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
      Organizations.verifySaveCalloutMessage(org);
      Organizations.editOrganization();
      Organizations.selectVendor();
      Organizations.saveOrganization();
      Organizations.verifySaveCalloutMessage(org);
      Organizations.checkIsaVendor(org);
      Organizations.editOrganization();
      Organizations.selectDonorCheckbox();
      Organizations.cancelOrganization();
      Organizations.closeWithoutSaving();
      Organizations.checkIsNotaDonor(org);
    },
  );
});
