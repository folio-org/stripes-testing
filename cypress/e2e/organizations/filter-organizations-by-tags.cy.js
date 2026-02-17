import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import Organizations from '../../support/fragments/organizations/organizations';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  let user;
  const organization1 = {
    ...NewOrganization.defaultUiOrganizations,
    tags: {
      tagList: [],
    },
  };
  const organization2 = {
    ...NewOrganization.defaultUiOrganizations,
    name: `autotest_name_2_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
    tags: {
      tagList: [],
    },
  };
  const tag1 = {
    name: `tag1_${getRandomPostfix()}`,
    id: '',
  };
  const tag2 = {
    name: `tag2_${getRandomPostfix()}`,
    id: '',
  };

  before('Create user and organizations with tags', () => {
    cy.getAdminToken();
    Organizations.createTagViaApi(tag1.name).then((tagId) => {
      tag1.id = tagId;
      organization1.tags.tagList.push(tag1.name);
    });
    Organizations.createTagViaApi(tag2.name).then((tagId) => {
      tag2.id = tagId;
      organization2.tags.tagList.push(tag2.name);
    });
    Organizations.createOrganizationViaApi(organization1).then((orgId1) => {
      organization1.id = orgId1;
    });
    Organizations.createOrganizationViaApi(organization2).then((orgId2) => {
      organization2.id = orgId2;
    });

    cy.createTempUser([permissions.uiOrganizationsView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization1.id);
    Organizations.deleteOrganizationViaApi(organization2.id);
    Organizations.deleteTagByIdViaApi(tag1.id, { failOnStatusCode: false });
    Organizations.deleteTagByIdViaApi(tag2.id, { failOnStatusCode: false });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6711 Filter Organizations by tags (thunderjet)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Organizations.selectTagFilter(tag1.name);
      Organizations.checkSearchResults(organization1.name);
      Organizations.resetFilters();
      Organizations.selectTagFilter(tag2.name);
      Organizations.checkSearchResults(organization2.name);
    },
  );
});
