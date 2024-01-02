import { Permissions } from '../../../support/dictionary';
import { ServicePoints } from '../../../support/fragments/settings/tenant';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    institutions: [],
    campuses: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint).then(({ body: servicePoint }) => {
      testData.servicePoint = servicePoint;

      [...Array(2)].forEach(() => {
        const institution = Institutions.getDefaultInstitution({
          name: `autotest_institution ${getRandomPostfix()}`,
        });

        Institutions.createViaApi(institution).then((locinst) => {
          testData.institutions.push(locinst);
          [...Array(2)].forEach(() => {
            const campus = Campuses.getDefaultCampuse({
              name: `autotest_campus ${getRandomPostfix()}`,
              institutionId: locinst.id,
            });

            Campuses.createViaApi(campus).then((loccamp) => {
              testData.campuses.push(loccamp);
            });
          });
        });
      });
      cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then((user) => {
        testData.user = user;
        cy.login(testData.user.username, testData.user.password);
        cy.wait(1000);
        TopMenuNavigation.navigateToApp('Settings');
        TenantPane.goToTenantTab();
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.campuses.forEach(({ id }) => {
      Campuses.deleteViaApi(id);
    });
    testData.institutions.forEach(({ id }) => {
      Institutions.deleteViaApi(id);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C398009 Verify that hyperlink "# of Campuses" navigates to a list of Campuses (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });

      // Select "Institutions" option on "Tenant" pane
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      Institutions.checkResultsTableContent([testData.institutions[0], testData.institutions[1]]);
      // Click on the hyperlink with number of campuses in "# of Campuses" column for one of existing Institutions
      Institutions.clickOnCampusesHyperlink(testData.institutions[0].name);
      // User is navigated to the "Campuses" pane with pre-populated values for "Institution" dropdown:
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // Select "Institutions" option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      // Navigate back to the "Campuses" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      // The previously selected settings remain:
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);
      // Select "Institutions" option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      // Click on the hyperlink with number of campuses in "# of Campuses" column for another Institution, differ from Step 2
      Institutions.clickOnCampusesHyperlink(testData.institutions[1].name);
      // User is navigated to the "Campuses" pane with pre-populated values for "Institution" dropdown:
      Campuses.checkResultsTableContent([testData.campuses[2], testData.campuses[3]]);
    },
  );
});
