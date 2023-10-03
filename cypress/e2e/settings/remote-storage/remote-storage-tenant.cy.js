import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import settingsMenu from '../../../support/fragments/settingsMenu';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import permissions from '../../../support/dictionary/permissions';

let user;

describe('remote-storage-configuration', () => {
  before('create user', () => {
    cy.createTempUser([permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.visit(settingsMenu.tenantLocationsPath);
    });
  });

  it(
    'C163922 Flag a location as remote storage (firebird)',
    { tags: [TestTypes.smoke, DevTeams.firebird] },
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
