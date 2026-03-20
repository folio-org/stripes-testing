import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization1 = {
    ...NewOrganization.defaultUiOrganizations,
    name: `autotest_kosovo_new_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_1`,
  };
  const organization2 = {
    ...NewOrganization.defaultUiOrganizations,
    name: `autotest_kosovo_pre_${getRandomPostfix()}`,
    code: `${getRandomPostfix()}_2`,
    addresses: [
      {
        addressLine1: '10 Estes Street',
        city: 'Ipswich',
        stateRegion: 'MA',
        zipCode: '01938',
        country: 'USA',
        language: 'en',
      },
    ],
  };
  const adress = {
    country: 'Kosovo',
  };
  let user;

  before('Setup test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization2).then((response) => {
      organization2.id = response;
    });

    cy.createTempUser([Permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization2.id);
    Organizations.getOrganizationViaApi({ name: organization1.name }).then((response) => {
      Organizations.deleteOrganizationViaApi(response.id);
    });
  });

  it(
    'C630465 Add "Kosovo" to country list on organization add/edit form and filtering (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C630465'] },
    () => {
      Organizations.newOrganization();
      Organizations.fillInInfoNewOrganization(organization1);
      Organizations.openContactInformationSection();
      Organizations.clickAddAdressButton();
      Organizations.addAdressToOrganization(adress, 0);
      Organizations.saveOrganization();
      OrganizationsSearchAndFilter.resetFiltersIfActive();
      OrganizationsSearchAndFilter.searchByParameters('Name', organization2.name);
      Organizations.selectOrganization(organization2.name);
      Organizations.editOrganization();
      Organizations.addAdressToOrganization(adress, 0);
      Organizations.saveOrganization();
      cy.wait(5000);
      OrganizationsSearchAndFilter.resetFiltersIfActive();
      OrganizationsSearchAndFilter.filterByCountry('Kosovo');
      Organizations.checkSearchResults(organization1);
      Organizations.checkSearchResults(organization2);
    },
  );
});
