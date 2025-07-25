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
          const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });

          Libraries.createViaApi(library).then((loclib) => {
            testData.libraries.push(loclib);
            [...Array(2)].forEach(() => {
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
            const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });

            Libraries.createViaApi(library).then((loclib) => {
              testData.libraries.push(loclib);
              // No one Location is assigned to **"Library D"**
              if (index !== 1) {
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
              }
            });
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
    'C399079 Verify that hyperlink  "# of Locations"  navigates to a list of Locations (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C399079'] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Libraries.openLibrariesTabFromSettingsList();
      // #1 Select **"Institution AB"** from Preconditions #1 in "Institution" dropdown on "Libraries" pane
      Libraries.selectOption('Institution', testData.institutions[0]);
      // Select **"Campus AB"** from Preconditions #2 in "Campus" dropdown
      Libraries.selectOption('Campus', testData.campuses[0]);
      Libraries.checkResultsTableContent([testData.libraries[0]]);
      // * "# of Locations" column consists of hyperlink with number of Locations associated with Library (e.g. **"Library AB"** record has **2** in "# of Locations" column)
      Libraries.checkLocationsColumnInResultsTable(['2']);

      // #2 Click on the hyperlink with number of Locations in "# of Locations" column for **"Library AB"** record
      Libraries.clickLocationsColumnLink();

      Locations.checkOptionSelected('Institution', testData.institutions[0]);
      Locations.checkOptionSelected('Campus', testData.campuses[0]);
      Locations.checkOptionSelected('Library', testData.libraries[0]);
      Locations.checkResultsTableContent([testData.locations[0], testData.locations[1]]);

      // #3 Select **"Libraries"** option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.LIBRARIES);
      // Select **"Institution CD"** from Preconditions #1 in "Institution" dropdown on "Libraries" pane
      Libraries.selectOption('Institution', testData.institutions[1]);
      // Select **"Campus C"** from Preconditions #3 in "Campus" dropdown
      Libraries.selectOption('Campus', testData.campuses[1]);
      Libraries.checkResultsTableContent([testData.libraries[1]]);
      // * "# of Locations" column consists of hyperlink with number of Locations associated with Library (e.g. **"Library C"** record has **1** in "# of Locations" column)
      Libraries.checkLocationsColumnInResultsTable(['1']);

      // #4 Click on the hyperlink with number of Locations in "# of Locations" column for **"Library C"** record
      Libraries.clickLocationsColumnLink();

      Locations.checkOptionSelected('Institution', testData.institutions[1]);
      Locations.checkOptionSelected('Campus', testData.campuses[1]);
      Locations.checkOptionSelected('Library', testData.libraries[1]);
      Locations.checkResultsTableContent([testData.locations[2]]);

      // #5 Select **"Libraries"** option on "Tenant" pane again
      TenantPane.selectTenant(TENANTS.LIBRARIES);
      // Select **"Institution CD"** from Preconditions #1 in "Institution" dropdown on "Libraries" pane
      Libraries.selectOption('Institution', testData.institutions[1]);
      // Select **"Campus D"** from Preconditions #3 in "Campus" dropdown
      Libraries.selectOption('Campus', testData.campuses[2]);
      Libraries.checkResultsTableContent([testData.libraries[2]]);
      // * "# of Locations" column consists of hyperlink with number of Locations associated with Library (e.g. **"Library D"** record has **0** in "# of Locations" column)
      Libraries.checkLocationsColumnInResultsTable(['0']);

      // #6 Click on the hyperlink with number of Locations in "# of Locations" column for **"Library D"** record
      Libraries.clickLocationsColumnLink();

      Locations.checkOptionSelected('Institution', testData.institutions[1]);
      Locations.checkOptionSelected('Campus', testData.campuses[2]);
      Locations.checkOptionSelected('Library', testData.libraries[2]);
      Locations.checkEmptyTableContent(true);
    },
  );
});
