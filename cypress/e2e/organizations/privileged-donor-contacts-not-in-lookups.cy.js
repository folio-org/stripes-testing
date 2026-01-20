import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = {
    ...newOrganization.defaultUiOrganizations,
    isVendor: true,
    isDonor: true,
    privilegedContacts: [],
  };
  const privilegedContact = { ...newOrganization.defaultContact };
  const privilegedContact2 = {
    firstName: `AT_FN_${getRandomPostfix()}_2`,
    lastName: `AT_LN_${getRandomPostfix()}_2`,
  };

  before('Create user, organization, and privileged donor contact', () => {
    cy.getAdminToken();
    Organizations.createPrivilegedContactViaApi(privilegedContact).then((contactId) => {
      privilegedContact.id = contactId;
      organization.privilegedContacts.push(contactId);
      Organizations.createOrganizationViaApi(organization).then((orgId) => {
        organization.id = orgId;
      });
    });
    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deletePrivilegedContactsViaApi(privilegedContact.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423630 Privileged Donor contacts do NOT appear in Contact Person lookups (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423630'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.openPrivilegedDonorInformationSection();
      Organizations.checkDonorContactIsAdd(privilegedContact);
      Organizations.editOrganization();
      Organizations.addNewDonorContact(privilegedContact2);
      Organizations.closeContact();
      Organizations.openContactPeopleSectionInEditCard();
      Organizations.checkZeroResultsInContactPeopleSearch(privilegedContact2);
      Organizations.checkZeroResultsInContactPeopleSearch(privilegedContact);
    },
  );
});
