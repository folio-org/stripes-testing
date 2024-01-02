import permissions from '../../../support/dictionary/permissions';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import settingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('remote-storage-configuration', () => {
  before('create user', () => {
    cy.createTempUser([permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.visit(settingsMenu.tenantLocationsPath);
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C163922 Flag a location as remote storage (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      const locationName = `loc_${getRandomPostfix()}`;

      // fill location data
      Locations.selectInstitution();
      Locations.selectCampus();
      Locations.selectLibrary();
      Locations.createNewLocation();

      // creating location
      CreateLocations.fillFolioName(locationName);
      CreateLocations.fillCode();
      CreateLocations.fillDiscoveryDisplayName();
      CreateLocations.selectRemoteStorage();
      CreateLocations.selectServicePoint();
      CreateLocations.saveAndClose();

      Locations.verifyRemoteStorageValue();
      Locations.deleteLocation(locationName);
    },
  );
});
