import Permissions from '../../support/dictionary/permissions';
import Localization from '../../support/fragments/settings/tenant/general/localization';
import TenantPane, { TENANTS } from '../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import DateTools from '../../support/utils/dateTools';

describe('Users', () => {
  const testData = {
    user: {},
    selectedExpirationDate: '',
    westernTimezone: 'Pacific/Nauru',
    easternTimezone: 'Pacific/Auckland',
    utcTimezone: 'UTC',
  };

  before('Preconditions: create user', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([
        Permissions.uiUserEdit.gui,
        Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
      ]).then((user) => {
        testData.user = user;

        testData.selectedExpirationDate = DateTools.getFormattedDate(
          {
            date: DateTools.addDays(30),
          },
          'MM/DD/YYYY',
        );

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.tenantPath,
          waiter: TenantPane.waitLoading,
        });
      });
    });
  });

  after('Cleanup', () => {
    cy.getAdminToken();
    cy.setDefaultLocaleApi();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C770460 Expiration date is not affected by time zone change (volaris)',
    { tags: ['extendedPath', 'volaris', 'C770460'] },
    () => {
      cy.waitForAuthRefresh(() => {}, 20_000);
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.changeTimezone(testData.westernTimezone);
      Localization.clickSaveButton();

      // Step 1: Click "Actions" -> "Edit" on user details pane
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersCard.waitLoading();
      UsersCard.verifyUserDetailsPaneOpen();
      UserEdit.openEdit();

      // Step 2: Populate "Expiration date" field with any date in future
      UserEdit.changeExpirationDate(testData.selectedExpirationDate);
      UserEdit.verifyExpirationDateFieldValue(testData.selectedExpirationDate);

      // Step 3: Click "Save & close" button
      UserEdit.saveAndClose();
      UsersCard.waitLoading();

      const formattedSelectedExpirationDate = DateTools.clearPaddingZero(
        testData.selectedExpirationDate,
      );
      // Verify user record is updated and expiration date is displayed
      UsersCard.checkKeyValue('Expiration date', formattedSelectedExpirationDate);

      // Step 4: Go to "Settings" -> "Tenant" -> "Language and localization"
      cy.visit(SettingsMenu.tenantPath);
      TenantPane.waitLoading();
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);

      // Change Time zone to a more Eastern one (Pacific/Auckland)
      Localization.changeTimezone(testData.easternTimezone);
      Localization.clickSaveButton();

      // Step 5: Return to "Users" app and open details pane for the same user
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersCard.waitLoading();
      UsersCard.verifyUserDetailsPaneOpen();

      // Check the "Expiration date" field on user details pane
      // The date should be the same as was set in step #2
      UsersCard.checkKeyValue('Expiration date', formattedSelectedExpirationDate);

      // Step 6: Click "Actions" -> "Edit" on user details pane / Check the "Expiration date" field on user edit page
      UserEdit.openEdit();
      UserEdit.verifyExpirationDateFieldValue(testData.selectedExpirationDate);

      cy.visit(SettingsMenu.tenantPath);
      TenantPane.waitLoading();
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.changeTimezone(testData.utcTimezone);
      Localization.clickSaveButton();
    },
  );
});
