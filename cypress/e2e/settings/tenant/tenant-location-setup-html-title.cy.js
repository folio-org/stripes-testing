import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import {
  Campuses,
  Institutions,
  Libraries,
  Locations,
  ServicePoints,
} from '../../../support/fragments/settings/tenant';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import LocationDetails from '../../../support/fragments/settings/tenant/locations/locationDetails';
import LocationEditForm from '../../../support/fragments/settings/tenant/locations/locationEditForm';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const institution = Institutions.getDefaultInstitution({
  name: `11_autotest_institution ${getRandomPostfix()}`,
});
const testData = {
  location: {},
};

describe('Settings: Tenant', () => {
  before('create test data', () => {
    cy.getAdminToken();

    Institutions.createViaApi(institution).then((locinst) => {
      testData.institutions = locinst;

      const campus = Campuses.getDefaultCampuse({
        name: `11_autotest_campus ${getRandomPostfix()}`,
        institutionId: locinst.id,
      });
      Campuses.createViaApi(campus).then((loccamp) => {
        testData.campuses = loccamp;

        const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });
        Libraries.createViaApi(library).then((loclib) => {
          testData.libraries = loclib;

          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePointData) => {
            testData.servicePoint = servicePointData;

            Locations.createViaApi({
              id: uuid(),
              code: `11_autotest_location_code-${getRandomPostfix()}`,
              name: `11_autotest_location_name-${getRandomPostfix()}`,
              isActive: true,
              institutionId: locinst.id,
              campusId: loccamp.id,
              libraryId: loclib.id,
              discoveryDisplayName: `11_autotest_location_discovery-${getRandomPostfix()}`,
              servicePointIds: [servicePointData.id],
              primaryServicePoint: servicePointData.id,
            }).then((location) => {
              testData.location = location;
            });
          });
        });
      });
    });
    cy.createTempUser([
      permissions.settingsTenantViewLocation.gui,
      permissions.uiTenantSettingsSettingsLocation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.wait(3000);
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Locations.deleteViaApi({
      id: testData.location.id,
      campusId: testData.campuses.id,
      libraryId: testData.libraries.id,
      institutionId: testData.institutions.id,
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C736704 Verify "Tenant -> Location setup" settings HTML page title format (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C736704'] },
    () => {
      TopMenuNavigation.navigateToApp('Settings');
      TenantPane.verifyPageTitle('Settings - FOLIO');
      TenantPane.goToTenantTab();
      TenantPane.verifyLocationSetupItems();
      TenantPane.verifyGeneralItems(false);
      TenantPane.verifyPageTitle('Tenant settings - FOLIO');
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      Institutions.waitLoading();
      TenantPane.verifyPageTitle('Tenant settings - Institutions - FOLIO');
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.waitLoading();
      TenantPane.verifyPageTitle('Tenant settings - Campuses - FOLIO');
      TenantPane.selectTenant(TENANTS.LIBRARIES);
      Libraries.waitLoading();
      TenantPane.verifyPageTitle('Tenant settings - Libraries - FOLIO');
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      Locations.waitLoading();
      TenantPane.verifyPageTitle('Tenant settings - Locations - FOLIO');
      Locations.selectOption('Institution', {
        name: testData.institutions.name,
        id: testData.institutions.id,
      });
      cy.wait(500);
      Locations.selectOption('Campus', {
        name: testData.campuses.name,
        id: testData.campuses.id,
      });
      cy.wait(500);
      Locations.selectOption('Library', {
        name: testData.libraries.name,
        id: testData.libraries.id,
      });
      cy.wait(500);
      Locations.openLocationDetails(testData.location.name);
      TenantPane.verifyPageTitle(`Tenant settings - ${testData.location.name} - FOLIO`);
      Locations.duplicate();
      TenantPane.verifyPageTitle('Tenant settings - New location - FOLIO');
      LocationEditForm.clickCancelButton();
      Locations.createNewLocation();
      TenantPane.verifyPageTitle('Tenant settings - New location - FOLIO');
      const locationName = `location_${getRandomPostfix()}`;
      CreateLocations.fillFolioName(locationName);
      CreateLocations.fillCode();
      CreateLocations.fillDiscoveryDisplayName();
      CreateLocations.selectRemoteStorage();
      CreateLocations.selectServicePoint();
      CreateLocations.saveAndClose();
      TenantPane.verifyPageTitle(`Tenant settings - ${locationName} - FOLIO`);
      LocationDetails.openEditLocationForm();
      TenantPane.verifyPageTitle(`Tenant settings - Edit: ${locationName} - FOLIO`);
      const newLocationName = `newLocation_${getRandomPostfix()}`;
      CreateLocations.fillFolioName(newLocationName);
      CreateLocations.saveAndClose();
      TenantPane.verifyPageTitle(`Tenant settings - ${newLocationName} - FOLIO`);
      Locations.openLocationDetails(newLocationName);
      Locations.deleteLocation(newLocationName);
      InteractorsTools.checkCalloutMessage(
        `The Location ${newLocationName} was successfully deleted.`,
      );
      TenantPane.verifyPageTitle('Tenant settings - Locations - FOLIO');
    },
  );
});
