import permissions from '../../../support/dictionary/permissions';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';

let user;
const institution = Institutions.getDefaultInstitution({
  name: `1_autotest_institution ${getRandomPostfix()}`,
});
let institutions;
let campuses;
let libraries;

describe('remote-storage-configuration', () => {
  before('create user', () => {
    cy.createTempUser([permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      user = userProperties;

      Institutions.createViaApi(institution).then((locinst) => {
        institutions = locinst;

        const campus = Campuses.getDefaultCampuse({
          name: `1_autotest_campus ${getRandomPostfix()}`,
          institutionId: locinst.id,
        });
        Campuses.createViaApi(campus).then((loccamp) => {
          campuses = loccamp;

          const library = Libraries.getDefaultLibrary({
            campusId: loccamp.id,
            name: `1_autotest_library ${getRandomPostfix()}`,
          });
          Libraries.createViaApi(library).then((loclib) => {
            libraries = loclib;
          });
        });
      });

      cy.login(user.username, user.password);
      cy.wait(1000);
      TopMenuNavigation.navigateToApp('Settings');
      Locations.goToLocationsTab();
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Libraries.deleteViaApi(libraries.id);
    Campuses.deleteViaApi(campuses.id);
    Institutions.deleteViaApi(institutions.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C163922 Flag a location as remote storage (volaris)',
    { tags: ['smoke', 'volaris', 'C163922'] },
    () => {
      const locationName = `1_loc_${getRandomPostfix()}`;

      // fill location data
      Locations.selectInstitution(institution.name);
      Locations.selectCampus(campuses.name);
      Locations.selectLibrary(libraries.name);
      Locations.createNewLocation();
      cy.wait(1000);

      // creating location
      CreateLocations.fillFolioName(locationName);
      CreateLocations.fillCode();
      CreateLocations.fillDiscoveryDisplayName();
      CreateLocations.selectRemoteStorage();
      CreateLocations.selectServicePoint();
      CreateLocations.saveAndClose();

      Locations.verifyRemoteStorageValue();
      cy.intercept('DELETE', '/locations/*').as('deleteLocation');
      Locations.deleteLocation(locationName);
      cy.wait('@deleteLocation');
    },
  );
});
