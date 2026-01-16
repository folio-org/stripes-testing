import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const tag = {
    name: `tag_${getRandomPostfix()}`,
    id: '',
  };
  before('Create user and organization', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiTagsPermissionAll.gui,
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
    Organizations.getTagByLabel(tag.name).then((tags) => {
      if (tags) tag.id = tags.id;
      Organizations.deleteTagById(tag.id, { failOnStatusCode: false });
    });
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6710 Add tags to an Organization record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C6710'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.verifyTagsCount(0);
      Organizations.organizationTagDetails();
      Organizations.addTagToOrganization(tag.name);
      Organizations.verifyTagsCount(1);
      Organizations.closeTagsPane();
      Organizations.organizationTagDetails();
      Organizations.selectAnyExistingTag();
      Organizations.verifyTagsCount(2);
    },
  );
});
