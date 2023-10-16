import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  Configurations,
  AccessionTables,
} from '../../../support/fragments/settings/remote-storage';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../../support/fragments/users/users';

describe('Remote Storage: Accession tables', () => {
  const testData = {
    servicePoint: {},
    location: {},
    configuration: {},
    userId: '',
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi().then(({ body: servicePoint }) => {
        testData.servicePoint = servicePoint;
        testData.location = Location.getDefaultLocation(servicePoint.id);

        Location.createViaApi(testData.location).then(({ id: folioLocationId }) => {
          testData.location.locationId = folioLocationId;

          testData.configuration = Configurations.createConfigurationWithMapping({
            folioLocationId,
          });
        });
      });
    });

    cy.createTempUser([Permissions.remoteStorageCRUD.gui, Permissions.inventoryAll.gui]).then(
      ({ userId, username, password }) => {
        testData.userId = userId;

        cy.login(username, password, {
          path: SettingsMenu.remoteStorageAccTablesPath,
          waiter: AccessionTables.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.location.institutionId,
      testData.location.campusId,
      testData.location.libraryId,
      testData.location.locationId,
    );
    Configurations.deleteViaApi(testData.configuration.id);
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C343224 Check that the created locations are displayed in the “Final location (Remote)” column (firebird) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.firebird] },
    () => {
      AccessionTables.verifyAccessionTablePane();

      AccessionTables.selectConfiguration(testData.configuration.name);
      AccessionTables.editFinalLocation({ location: testData.location.name });
      AccessionTables.checkTableContent([testData.location]);
    },
  );
});
