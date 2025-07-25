import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: {},
    user: {},
    institutions: [],
    campuses: [],
    libraries: [],
    locations: [],
  };

  const createTestData = () => {
    const service = ServicePoints.getDefaultServicePoint();
    ServicePoints.createViaApi(service).then(({ body: servicePoint }) => {
      testData.servicePoint = servicePoint;

      const institutionAB = Institutions.getDefaultInstitution({
        name: `1_autotest_institution ${getRandomPostfix()}`,
      });

      Institutions.createViaApi(institutionAB).then((locinst) => {
        testData.institutions.push(locinst);

        const campus = Campuses.getDefaultCampuse({
          name: `1_autotest_campus ${getRandomPostfix()}`,
          institutionId: locinst.id,
        });

        Campuses.createViaApi(campus).then((loccamp) => {
          testData.campuses.push(loccamp);
          testData.campuses[testData.campuses.length - 1].numOfLibraries = 0;
          [...Array(2)].forEach(() => {
            const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });
            Libraries.createViaApi(library).then((loclib) => {
              testData.libraries.push(loclib);
              testData.campuses[testData.campuses.length - 1].numOfLibraries++;
              Locations.createViaApi({
                id: uuid(),
                code: `1_autotest_location_code-${getRandomPostfix()}`,
                name: `1_autotest_location_name-${getRandomPostfix()}`,
                isActive: true,
                institutionId: locinst.id,
                campusId: loccamp.id,
                libraryId: loclib.id,
                discoveryDisplayName: `1_autotest_location_discovery-${getRandomPostfix()}`,
                servicePointIds: [servicePoint.id],
                primaryServicePoint: servicePoint.id,
              }).then((location) => {
                testData.locations.push(location);
              });
            });
          });
        });
      });

      const institutionCD = Institutions.getDefaultInstitution({
        name: `1_autotest_institution ${getRandomPostfix()}`,
      });

      Institutions.createViaApi(institutionCD).then((locinst) => {
        testData.institutions.push(locinst);

        [...Array(2)].forEach((_, index) => {
          const campus = Campuses.getDefaultCampuse({
            name: `1_autotest_campus ${getRandomPostfix()}`,
            institutionId: locinst.id,
          });

          Campuses.createViaApi(campus).then((loccamp) => {
            testData.campuses.push(loccamp);
            testData.campuses[testData.campuses.length - 1].numOfLibraries = 0;

            const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });
            // No one Library is assigned to "Campus D"
            if (index !== 1) {
              Libraries.createViaApi(library).then((loclib) => {
                testData.libraries.push(loclib);
                testData.campuses[testData.campuses.length - 1].numOfLibraries++;
              });
            }
          });
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createTestData();
    });
    cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.locations.forEach(({ id }) => {
      Locations.deleteViaApi({ id });
    });
    testData.libraries.forEach(({ id }) => {
      Libraries.deleteViaApi(id);
    });
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
    'C399080 Verify that hyperlink  "# of Libraries" navigates to a list of Libraries (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C399080'] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Campuses.openCampusesTabFromSettingsList();

      // #1 Select **"Institution AB"** from Preconditions #1 in "Institution" dropdown on "Campuses" pane
      Campuses.selectOption('Institution', testData.institutions[0]);
      Campuses.checkResultsTableContent([testData.campuses[0]]);
      // * "# of Libraries" column consists of hyperlink with number of Libraries associated with Campus (e.g. **"Campus AB"** record has **2** in "# of Libraries" column)
      Campuses.checkLibrariesColumnInResultsTable([testData.campuses[0]]);
      // #2 Click on the hyperlink with number of Libraries in "# of Libraries" column for **"Campus AB"** record
      Campuses.clickLibrariesColumnLink(testData.campuses[0].name);
      Libraries.checkResultsTableContent([testData.libraries[0], testData.libraries[1]]);
      // #3 Select **"Campuses"** option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      // Select **"Institution CD"** from Preconditions #1 in "Institution" dropdown on "Campuses" pane
      Campuses.selectOption('Institution', testData.institutions[1]);
      Campuses.checkResultsTableContent([testData.campuses[1], testData.campuses[2]]);
      // * "# of Libraries" column consists of hyperlink with number of Libraries associated with Campuses (e.g. **"Campus C"** record has **1** in "# of Libraries" column; **"Campus D"** record has **0** in "# of Libraries" column)
      Campuses.checkLibrariesColumnInResultsTable([testData.campuses[1], testData.campuses[2]]);

      // #4 Click on the hyperlink with number of Libraries in "# of Libraries" column for **"Campus C"** record
      Campuses.clickLibrariesColumnLink(testData.campuses[1].name);
      Libraries.checkResultsTableContent([testData.libraries[2]]);

      // #5 Select **"Campuses"** option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      // Click on the hyperlink with number of Libraries in "# of Libraries" column for **"Campus D"** record
      Campuses.clickLibrariesColumnLink(testData.campuses[2].name);
      Libraries.checkEmptyTableContent();
    },
  );
});
