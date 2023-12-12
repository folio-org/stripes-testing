import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TenantPane from '../../../support/fragments/settings/tenant/tenantPane';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';

describe('Settings: Tenant', () => {
  let locationName;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };

  before('Create authorized user', () => {
    cy.getAdminToken();
    Configurations.createViaApi().then((res) => {
      testData.configuration = res;
    });
    ServicePoints.createViaApi(testData.servicePoint);
    const { location } = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    });
    testData.location = location;
    Locations.createViaApi(testData.location);
    cy.createTempUser([
      Permissions.settingsTenantView.gui,
      Permissions.uiTenantSettingsSettingsLocation.gui,
      Permissions.circulationLogAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantLocationsPath,
        waiter: TenantPane.waitLoading,
      });
      cy.reload();
      locationName = `location_${getRandomPostfix()}`;
      // fill location data
      Locations.selectInstitution();
      Locations.selectCampus();
      Locations.selectLibrary();
      Locations.createNewLocation();
      // creating location
      CreateLocations.fillFolioName(locationName);
      CreateLocations.fillCode();
      CreateLocations.fillDiscoveryDisplayName();
      CreateLocations.selectRemoteStorage(testData.configuration.name);
      CreateLocations.selectServicePoint();
      CreateLocations.saveAndClose();
      Locations.verifyRemoteStorageValue(testData.configuration.name);
    });
  });

  after('Delete authorized user', () => {
    cy.getAdminToken();
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Configurations.deleteViaApi(testData.configuration.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C163925 View remote storage details in settings > tenant > location (firebird) (TaaS)',
    {
      tags: ['criticalPath', 'firebird'],
    },
    () => {
      // Navigate to Settings > Tenant > Locations
      cy.visit(SettingsMenu.tenantLocationsPath);
      // Select institution, campus and library used to create location
      Locations.selectInstitution();
      Locations.selectCampus();
      Locations.selectLibrary();
      // Select created location in precondition with remote storage from "Locations" table
      Locations.openLocationDetails(locationName);
      // Verify that "Remote storage" is available below the "Description"
      Locations.verifyRemoteStorageValue(testData.configuration.name);
    },
  );
});
