import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: {
      name: `autotest_sp_name_${getRandomPostfix()}`,
      code: `autotest_sp_code_${getRandomPostfix()}`,
      displayName: `autotest_sp_display_${getRandomPostfix()}`,
    },
    updatedServicePoint: {
      name: `autotest_sp_name_upd_${getRandomPostfix()}`,
    },
    user: {},
  };

  before('Create test data', () => {
    // Capability set "Settings - UI-Tenant-Settings Settings Service Points - Manage"
    cy.createTempUser([Permissions.uiTenantSettingsServicePointsCRUD.gui]).then(
      (userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.tenantPath,
          waiter: TenantPane.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      [testData.servicePoint.name, testData.updatedServicePoint.name].forEach((name) => {
        ServicePoints.getViaApi({ query: `name=="${name}"` }).then((servicePoints) => {
          if (servicePoints.length) {
            ServicePoints.deleteViaApi(servicePoints[0].id);
          }
        });
      });
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C519 Settings - UI-Tenant-Settings Settings Service Points - Manage (firebird)',
    { tags: ['extendedPath', 'firebird', 'C519'] },
    () => {
      // Step 6: Open Settings App and navigate to Tenant settings --> Service Points
      // 7.1) See "Service points" menu option
      TenantPane.verifyNavigationOption(TENANTS.SERVICE_POINTS);

      // 7.2) See service point list in the right pane
      TenantPane.selectTenant(TENANTS.SERVICE_POINTS);
      ServicePoints.waitLoading();
      ServicePoints.verifyNewButtonEnabled();

      // 7.3) CREATE: Add a new Service Point
      ServicePoints.createNewServicePoint(testData.servicePoint);
      ServicePoints.servicePointExists(testData.servicePoint.name);

      // READ: Open service point details and verify edit button is available
      ServicePoints.openServicePointDetails(testData.servicePoint.name);
      ServicePoints.verifyEditAndCloseButtonEnabled();
      ServicePoints.closeServicePointPane(testData.servicePoint.name);

      // UPDATE: Edit the service point name and save
      ServicePoints.editServicePoint({
        name: testData.servicePoint.name,
        newName: testData.updatedServicePoint.name,
      });
      ServicePoints.servicePointExists(testData.updatedServicePoint.name);
    },
  );
});
