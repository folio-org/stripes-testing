import { Permissions } from '../../../support/dictionary';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import ExceptionModal from '../../../support/fragments/settings/tenant/modals/exceptionModal';
import TopMenu from '../../../support/fragments/topMenu';

describe('Settings: Tenant', () => {
  const testData = {
    user: {},
    institutions: [],
    campuses: [],
    libraries: [],
  };

  const createTestData = () => {
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

          if (testData.campuses.length !== 2) {
            const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });
            Libraries.createViaApi(library).then((loclib) => {
              testData.libraries.push(loclib);
            });
          }
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
      cy.wait(2000);
      cy.visit(TopMenu.settingsPath);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.libraries.forEach(({ id }) => {
      Libraries.deleteViaApi(id);
    });
    testData.campuses.forEach(({ id }) => {
      Campuses.deleteViaApi(id);
    });
    testData.institutions.forEach(({ id }) => {
      Institutions.deleteViaApi(id);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C374179 Delete Campus (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374179'] },
    () => {
      TenantPane.goToTenantTab();
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      TenantPane.selectTenant(TENANTS.CAMPUSES);

      // #1 Select Institution from Preconditions item #1 in "Institution" dropdown on "Campuses" pane
      Campuses.selectOption('Institution', testData.institutions[0]);
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);
      // #2 Click "Delete" icon for **"Campus A"** record
      const DeleteModal = Campuses.clickDeleteBtn({ record: testData.campuses[0].name });
      DeleteModal.verifyModalView(`The campus ${testData.campuses[0].name} will be deleted.`);

      // #3 Click "Delete" button
      DeleteModal.confirm();
      ExceptionModal.verifyExceptionMessage(
        'This campus cannot be deleted, as it is in use by one or more records.',
      );

      // #4 Click "Okay" button
      ExceptionModal.clickOkayButton();
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // #5 Click "Delete" icon for **"Campus B"** record
      Campuses.clickDeleteBtn({ record: testData.campuses[1].name });
      DeleteModal.verifyModalView(`The campus ${testData.campuses[1].name} will be deleted.`);

      // #6 Click "Cancel" button
      DeleteModal.cancel();
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // #7 Click "Delete" icon for **"Campus B"** record one more time
      Campuses.clickDeleteBtn({ record: testData.campuses[1].name });
      // #8 Click "Delete" button
      DeleteModal.confirm();
      InteractorsTools.checkCalloutMessage(
        `The campus ${testData.campuses[1].name} was successfully deleted`,
      );
      Campuses.checkResultsTableContent([testData.campuses[0]]);
      Campuses.checkRecordIsAbsent(testData.campuses[1]);
      testData.campuses.pop();
    },
  );
});
