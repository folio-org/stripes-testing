import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';

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

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization2).then((response) => {
      organization2.id = response;
    });

    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
    Organizations.deleteOrganizationViaApi(organization2.id);
    Organizations.searchByParameters('Name', organization1.name);
    Organizations.selectOrganization(organization1.name);
    Organizations.deleteOrganization(organization1.name);
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
      Organizations.searchByParameters('Name', organization2.name);
      Organizations.selectOrganization(organization2.name);
      Organizations.editOrganization();
      Organizations.addAdressToOrganization(adress, 0);
      Organizations.saveOrganization();
      Organizations.resetFilters();
      Organizations.selectCountryFilter('Kosovo');
      Organizations.checkSearchResults(organization1);
      Organizations.checkSearchResults(organization2);
    },
  );
});
