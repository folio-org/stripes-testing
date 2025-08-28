import { Permissions } from '../../../support/dictionary';
import { ServicePoints } from '../../../support/fragments/settings/tenant';
import Addresses from '../../../support/fragments/settings/tenant/general/addresses';
import Localization from '../../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    const newServicePoint = {
      name: `newServicePoint_${getRandomPostfix()}`,
      code: `newServicePointCode_${getRandomPostfix()}`,
      displayName: `newServicePointDisplayName_${getRandomPostfix()}`,
      newNameForEdit: `test_${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);

      cy.createTempUser([
        Permissions.uiTenantSettingsServicePointsCRUD.gui,
        Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
        Permissions.uiSettingsTenantPlugins.gui,
        Permissions.uiSettingsTenantAddresses.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp('Settings');
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
    });

    it(
      'C410826 Verify "Tenant -> General" settings HTML page title format (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C410826'] },
      () => {
        // Verify opened page title format: HTML page title is "Settings - FOLIO"
        cy.wait(500);
        TenantPane.verifyPageTitle('Settings - FOLIO');
        // Click "Tenant" in "Settings" pane
        cy.reload();
        TenantPane.goToTenantTab();
        TenantPane.verifyGeneralItems();
        TenantPane.verifyLocationSetupItems(false);
        // Verify opened page title format: HTML page title is "Tenant settings - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - FOLIO');
        // Click "Addresses" option under "General" label
        TenantPane.selectTenant(TENANTS.ADDRESSES);
        Addresses.waitLoading();
        // Verify opened page title format: HTML page title is "Tenant settings - Addresses - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - Addresses - FOLIO');
        // Click "Language and localization" option under "General" label
        TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
        Localization.checkPaneContent(false);
        // Verify opened page title format: HTML page title is "Tenant settings - Language and localization - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - Language and localization - FOLIO');
        // Click "Preferred plugins" option under "General" label
        TenantPane.selectTenant(TENANTS.PREFERRED_PLUGINS);
        // Verify opened page title format: HTML page title is "Tenant settings - Preferred plugins - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - Preferred plugins - FOLIO');
        // Click "Service points" option under "General" label
        TenantPane.selectTenant(TENANTS.SERVICE_POINTS);
        ServicePoints.waitLoading();
        ServicePoints.verifyNewButtonEnabled();
        // Verify opened page title format: HTML page title is "Tenant settings - Service points - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - Service points - FOLIO');
        ServicePoints.servicePointExists(testData.servicePoint.name);
        // Click the row with any service point in the "Service points" pane
        ServicePoints.openServicePointDetails(testData.servicePoint.name);
        ServicePoints.verifyEditAndCloseButtonEnabled();
        // Verify opened page title format: HTML page title is "Tenant settings - ${testData.servicePoint.name} - Service points - FOLIO"
        TenantPane.verifyPageTitle(
          `Tenant settings - ${testData.servicePoint.name} - Service points - FOLIO`,
        );
        // Click "Edit" button in the service point pane
        ServicePoints.openEditServicePointForm(testData.servicePoint.name);
        // Verify opened page title format: HTML page title is "Tenant settings - Edit: ${testData.servicePoint.name} - Service points - FOLIO"
        TenantPane.verifyPageTitle(
          `Tenant settings - Edit: ${testData.servicePoint.name} - Service points - FOLIO`,
        );
        // Close Edit form
        ServicePoints.closeEditServicePointForm();
        // Click "New" button in "Service points" pane
        ServicePoints.openNewServicePointForm();
        // Verify opened page title format: HTML page title is "Tenant settings - New service point - Service points - FOLIO"
        TenantPane.verifyPageTitle('Tenant settings - New service point - Service points - FOLIO');
        ServicePoints.closeNewServicePointForm();
        // Create new Service point
        ServicePoints.createNewServicePoint(newServicePoint);
        // Verify opened page title format: HTML page title is "Tenant settings - ${newServicePoint.name} - Service points - FOLIO"
        TenantPane.verifyPageTitle(
          `Tenant settings - ${newServicePoint.name} - Service points - FOLIO`,
        );
        // Click "Edit" button in the service point pane
        ServicePoints.openEditServicePointForm(newServicePoint.name);
        // Verify opened page title format: HTML page title is "Tenant settings - Edit: ${newServicePoint.name} - Service points - FOLIO"
        TenantPane.verifyPageTitle(
          `Tenant settings - Edit: ${newServicePoint.name} - Service points - FOLIO`,
        );
        ServicePoints.closeEditServicePointForm();
        // Edit "Name*" text field with any text => Click "Save & close" button
        ServicePoints.editServicePoint({
          name: newServicePoint.name,
          newName: newServicePoint.newNameForEdit,
        });
        // Verify opened page title format: HTML page title is "Tenant settings - ${newServicePoint.newNameForEdit} - Service points - FOLIO"
        TenantPane.verifyPageTitle(
          `Tenant settings - ${newServicePoint.newNameForEdit} - Service points - FOLIO`,
        );
      },
    );
  });
});
