import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { Institutions, Campuses, Libraries, Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import LocationEditForm from '../../../support/fragments/settings/tenant/locations/locationEditForm';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import InteractorsTools from '../../../support/utils/interactorsTools';
import LocationDetails from '../../../support/fragments/settings/tenant/locations/locationDetails';

let user;
const testData = {
  servicePoint: ServicePoints.getDefaultServicePoint(),
  location: {},
};

describe('Settings: Tenant', () => {
  before('create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      const { institution, location } = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      });
      testData.institution = institution;
      testData.location = location;
      Locations.createViaApi(testData.location);
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
    cy.getAdminToken().then(() => {
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C410829 Verify "Tenant -> Location setup" settings HTML page title format (firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      TopMenuNavigation.navigateToApp('Settings');
      TenantPane.verifyPageTitle('Settings - FOLIO');
      TenantPane.goToTenantTab();
      TenantPane.verifyLocationSetupItems();
      TenantPane.verifyNoGeneralItems();
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
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      Locations.selectOption('Campus', {
        name: testData.location.campusName,
        id: testData.location.campusId,
      });
      Locations.selectOption('Library', {
        name: testData.location.libraryName,
        id: testData.location.libraryId,
      });
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
      InteractorsTools.checkCalloutMessage(`The Location ${newLocationName} was successfully deleted.`);
      TenantPane.verifyPageTitle('Tenant settings - Locations - FOLIO');
    },
  );
});
