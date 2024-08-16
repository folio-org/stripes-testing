import permissions from '../../../support/dictionary/permissions';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;

describe('remote-storage-configuration', () => {
  before('create user', () => {
    cy.createTempUser([permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.wait(1000);
      TopMenuNavigation.navigateToApp('Settings');
      Locations.goToLocationsTab();
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
      cy.wait(1000);

      // creating location
      CreateLocations.fillFolioName(locationName);
      cy.wait(1000);
      CreateLocations.fillCode();
      cy.wait(1000);
      CreateLocations.fillDiscoveryDisplayName();
      cy.wait(1000);
      CreateLocations.selectRemoteStorage();
      cy.wait(1000);
      CreateLocations.selectServicePoint();
      cy.wait(1000);
      CreateLocations.saveAndClose();
      cy.wait(1000);

      Locations.verifyRemoteStorageValue();
      Locations.deleteLocation(locationName);
    },
  );
});
