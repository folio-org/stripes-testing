import TopMenu from '../../../support/fragments/topMenu';
import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import settingsMenu from '../../../support/fragments/settingsMenu';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import Locations from '../../../support/fragments/settings/tenant/locations/locations';
import devTeams from '../../../support/dictionary/devTeams';

describe('remote-storage-configuration', () => {
  beforeEach('login', () => {
    // TODO: need to clarify about permissions at FAT-1196
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.remoteStorageConfigurationPath);
  });

  // parametrized providers
  [
    RemoteStorageHelper.configurations.CaiaSoft,
    RemoteStorageHelper.configurations.DematicEMS,
    RemoteStorageHelper.configurations.DematicStagingDirector
  ].forEach(configuration => {
    it('C163919 Configure remote storage (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      configuration.create(name);
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.editConfiguration(name, { nameInput: 'newAutotestConfigurationName' });
      RemoteStorageHelper.closeWithoutSaving();
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.deleteRemoteStorage(name);
    });
  });

  it('C163920 Edit remote storage configuration  (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    const name = `AutotestConfigurationName${getRandomPostfix()}`;
    const configuration = RemoteStorageHelper.configurations.DematicStagingDirector;
    const urlToEdit = 'newTestUrl';
    const timingToEdit = '7';

    configuration.create(name);
    RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);

    // edit and verify url
    RemoteStorageHelper.editConfiguration(name, { urlInput: urlToEdit });
    RemoteStorageHelper.closeWithSaving();
    RemoteStorageHelper.verifyEditedConfiguration(name, { urlInput: urlToEdit });

    // edit and verify timing
    RemoteStorageHelper.editConfiguration(name, { timingInput: timingToEdit });
    RemoteStorageHelper.closeWithoutSaving();
    RemoteStorageHelper.editConfiguration(name, { urlInput: urlToEdit, timingInput: '1' });

    // delete created configuration
    RemoteStorageHelper.deleteRemoteStorage(name);
  });

  it('C163922 Flag a location as remote storage (firebird)', { tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    cy.visit(settingsMenu.tenantLocationsPath);
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
  });
});
