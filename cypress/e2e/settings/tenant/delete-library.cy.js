import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import interactorsTools from '../../../support/utils/interactorsTools';
import ExceptionModal from '../../../support/fragments/settings/tenant/modals/exceptionModal';
import settingsPane from '../../../support/fragments/settings/settingsPane';

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
      const institution = Institutions.getDefaultInstitution({
        name: `1aaa_autotest_institution ${getRandomPostfix()}`,
      });

      Institutions.createViaApi(institution).then((locinst) => {
        testData.institutions.push(locinst);

        const campus = Campuses.getDefaultCampuse({
          name: `1aaa_autotest_campus ${getRandomPostfix()}`,
          institutionId: locinst.id,
        });

        Campuses.createViaApi(campus).then((loccamp) => {
          testData.campuses.push(loccamp);
          [...Array(2)].forEach(() => {
            const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });

            Libraries.createViaApi(library).then((loclib) => {
              testData.libraries.push(loclib);
              // No one Location should be assigned to "Library B"
              if (testData.libraries.length !== 2) {
                Locations.createViaApi({
                  id: uuid(),
                  code: `1aaa_autotest_location_code-${getRandomPostfix()}`,
                  name: `1aaa_autotest_location_name-${getRandomPostfix()}`,
                  isActive: true,
                  institutionId: locinst.id,
                  campusId: loccamp.id,
                  libraryId: loclib.id,
                  discoveryDisplayName: `autotest_location_discovery-${getRandomPostfix()}`,
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
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.settingsPath,
        waiter: settingsPane.waitLoading,
      });
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
    'C374195 Delete Library (thunderjet) (TaaS)',
    { tags: ['extendedPathFlaky', 'thunderjet', 'C374195'] },
    () => {
      TenantPane.goToTenantTab();
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      TenantPane.selectTenant(TENANTS.LIBRARIES);

      // #1 Select Institution from Preconditions item #1 in "Institution" dropdown on "Campuses" pane
      Libraries.selectOption('Institution', testData.institutions[0]);
      // #2 Select Campus from Preconditions item #2 in "Campus" dropdown
      Libraries.selectOption('Campus', testData.campuses[0]);
      Libraries.checkResultsTableContent([testData.libraries[0], testData.libraries[1]]);

      // #3 Click "Delete" icon for **"Library A"** record
      const DeleteModal = Libraries.clickDeleteBtn({ record: testData.libraries[0].name });
      DeleteModal.verifyModalView(`The library ${testData.libraries[0].name} will be deleted.`);

      // #4 Click "Cancel" button
      DeleteModal.cancel();
      Libraries.checkResultsTableContent([testData.libraries[0], testData.libraries[1]]);

      // #5 - #6 Click "Delete" icon for **"Library A"** record one more time -> Click "Delete" button
      Libraries.clickDeleteBtn({ record: testData.libraries[0].name });
      DeleteModal.confirm();
      ExceptionModal.verifyExceptionMessage(
        'This library cannot be deleted, as it is in use by one or more records.',
      );

      // #7 Click "Okay" button
      ExceptionModal.clickOkayButton();

      // #8 - #9 Click "Delete" icon for **"Library B"** record -> Click "Delete" button
      Libraries.clickDeleteBtn({ record: testData.libraries[1].name });
      DeleteModal.confirm();

      // * Toast message "The library **"Library B"** was successfully deleted" appears
      interactorsTools.checkCalloutMessage(
        `The library ${testData.libraries[1].name} was successfully deleted`,
      );
      // * **"Library B"** record was deleted and NOT displaying in "Libraries" table
      Libraries.checkRecordIsAbsent(testData.libraries[1].name);
      testData.libraries.pop();
    },
  );
});
