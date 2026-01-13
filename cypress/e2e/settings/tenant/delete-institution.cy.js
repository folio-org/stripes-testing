import { Permissions } from '../../../support/dictionary';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import ExceptionModal from '../../../support/fragments/settings/tenant/modals/exceptionModal';

describe('Settings: Tenant', () => {
  const testData = {
    user: {},
    institutions: [],
    campuses: [],
  };

  const createTestData = () => {
    return [...Array(2)].forEach(() => {
      const institution = Institutions.getDefaultInstitution({
        name: `autotest_institution ${getRandomPostfix()}`,
      });

      Institutions.createViaApi(institution).then((locinst) => {
        testData.institutions.push(locinst);
        cy.log(testData.institutions);
        // Institution B has NO issighned campuses
        if (testData.institutions.length !== 2) {
          const campus = Campuses.getDefaultCampuse({
            name: `autotest_campus ${getRandomPostfix()}`,
            institutionId: locinst.id,
          });
          Campuses.createViaApi(campus).then((loccamp) => {
            testData.campuses.push(loccamp);
          });
        }
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createTestData();

      cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password);
          cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
        },
      );
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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C374185 Delete Institution (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374185'] },
    () => {
      // #1 Select "Institutions" option in "Location setup" section on "Tenant" pane
      cy.visit(SettingsMenu.tenantInstitutionsPath);
      Institutions.checkResultsTableContent([testData.institutions[0], testData.institutions[1]]);

      // #2 Click "Delete" icon for **"Institution A"** record
      const DeleteModal = Institutions.clickDeleteBtn({ record: testData.institutions[0].name });
      DeleteModal.verifyModalView(
        `The institution ${testData.institutions[0].name} will be deleted.`,
      );

      // #3 Click "Delete" button
      DeleteModal.confirm();
      ExceptionModal.verifyExceptionMessage(
        'This institution cannot be deleted, as it is in use by one or more records.',
      );

      // #4 Click "Okay" button
      ExceptionModal.clickOkayButton();
      Institutions.checkResultsTableContent([testData.institutions[0], testData.institutions[1]]);

      // #5 Click "Delete" icon for **"Institution B"** record
      Institutions.clickDeleteBtn({ record: testData.institutions[1].name });
      DeleteModal.verifyModalView(
        `The institution ${testData.institutions[1].name} will be deleted.`,
      );

      // #6 Click keyboard "esc" button
      DeleteModal.closeModalByEsc();
      Institutions.checkResultsTableContent([testData.institutions[0], testData.institutions[1]]);

      // #7 Click "Delete" icon for **"Institution B"** record one more time
      Institutions.clickDeleteBtn({ record: testData.institutions[1].name });

      // #8 Click "Delete" button
      DeleteModal.confirm();
      InteractorsTools.checkCalloutMessage(
        `The institution ${testData.institutions[1].name} was successfully deleted`,
      );
      Institutions.checkResultsTableContent([testData.institutions[0]]);
      Institutions.checkRecordIsAbsent(testData.institutions[1]);
      testData.institutions.pop();
    },
  );
});
