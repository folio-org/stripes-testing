import { Permissions } from '../../../support/dictionary';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Addresses from '../../../support/fragments/settings/tenant/general/addresses';
import Localication from '../../../support/fragments/settings/tenant/general/localication';
import SSOSettings from '../../../support/fragments/settings/tenant/general/ssoSettings';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    newAddress: {
      name: `addressName_${getRandomPostfix()}`,
      address: `address_${getRandomPostfix()}`,
    },
  };
  let addressId;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    const { institution, location } = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    });
    testData.institution = institution;
    testData.location = location;
    Locations.createViaApi(testData.location);
    cy.createTempUser([Permissions.settingsTenantView.gui]).then((userProperties) => {
      testData.user = userProperties;
      Addresses.setAddress(testData.newAddress).then((address) => {
        addressId = address.id;
      });
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Addresses.deleteAddress(addressId);
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C410753 Settings (tenant): View -- General (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      // Click on "Addresses" in the General subsection.
      TenantPane.selectTenant(TENANTS.ADDRESSES);
      Addresses.waitLoading();
      Addresses.checkNoActionButtons();
      // Click in the "Last updated" column on the creator's name.
      Addresses.openLastUpdated(testData.newAddress.name);
      Addresses.verifyNoPermissionWarning();

      cy.visit(SettingsMenu.tenantPath);
      TenantPane.waitLoading();
      // Click on "Language and localization" in the General subsection.
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localication.waitLoading();
      Localication.checkPaneContent(false);
      Localication.checkLockIcons();

      // Click on  "SSO settings" in the General subsection.
      TenantPane.selectTenant(TENANTS.SSO_SETTINGS);
      SSOSettings.waitLoading();
      SSOSettings.checkPaneContent(true);

      // Click on "Service points" in the General subsection.
      TenantPane.selectTenant(TENANTS.SERVICE_POINTS);
      ServicePoints.servicePointExists(testData.servicePoint.name);
      // Click on any service point name
      ServicePoints.openServicePointDetails(testData.servicePoint.name);
      ServicePoints.checkPaneContent(testData.servicePoint);
      // Click on "Collapse all" button on the 4th section.
      ServicePoints.collapseSection();
      // Click on close icon/button "X" .
      ServicePoints.closeServicePointPane(testData.servicePoint.name);
    },
  );
});
