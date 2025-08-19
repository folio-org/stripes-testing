import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TenantPane, { TENANTS } from '../../support/fragments/settings/tenant/tenantPane';
import Localization, {
  LANGUAGES,
} from '../../support/fragments/settings/tenant/general/localization';
import DateTools from '../../support/utils/dateTools';
import SettingsMenu from '../../support/fragments/settingsMenu';

const convertDateToBritishFormat = (dateString) => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const [day, month, year] = dateString.split('/');

  const monthName = months[parseInt(month, 10) - 1];

  return `${day} ${monthName} ${year}`;
};

describe('Users', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: `PG_${Date.now()}`,
      description: 'PG with offset',
      offsetDays: 10,
    },
  };

  before('Preconditions: user, patron group, locale', () => {
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
        (id) => {
          testData.patronGroup.id = id;
        },
      );
      cy.createTempUser([
        permissions.uiUsersCreate.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
        permissions.settingsTenantView.gui,
        permissions.uiSettingsDeveloperSessionLocale.gui,
        permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
      ]).then((localeUser) => {
        testData.user = localeUser;
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
    PatronGroups.deleteViaApi(testData.patronGroup.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C692246 Correct date is shown on popup when expiration date is set from patron group using non-default locale (volaris)',
    { tags: ['extendedPath', 'volaris', 'C692246'] },
    () => {
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.checkPaneContent();
      Localization.changeLocalLanguage(LANGUAGES.BRITISH_ENGLISH);
      Localization.clickSaveButton();

      // Step 1: open any active user
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(testData.user.username);
      cy.waitForAuthRefresh(() => {}, 20_000);
      UsersCard.waitLoading();

      // Step 2: open Edit
      UserEdit.openEdit();

      // Step 3: choose patron group with offset and verify popup date (British format DD MMMM YYYY)
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      const expectedDate = DateTools.getFormattedDate(
        {
          date: DateTools.addDays(testData.patronGroup.offsetDays),
        },
        'DD/MM/YYYY',
      );

      // Convert date to UK format for popup verification
      const dateFormat = convertDateToBritishFormat(expectedDate);

      UserEdit.verifySetExpirationDatePopup(
        testData.patronGroup.name,
        testData.patronGroup.offsetDays,
        dateFormat,
      );

      // Step 4: confirm popup, verify field value
      UserEdit.setExpirationDate();
      UserEdit.verifyExpirationDateFieldValue(expectedDate);

      // Step 5: save and verify on details
      UserEdit.saveAndClose();
      UsersCard.waitLoading();
      UsersCard.checkKeyValue('Patron group', `${testData.patronGroup.name}`);
      UsersCard.checkKeyValue('Expiration date', expectedDate);

      // Step 6: open Create User
      UsersCard.close();
      Users.clickNewButton();
      UserEdit.checkUserCreatePaneOpened();

      // Step 7: select patron group and verify popup date again
      UserEdit.changeLastName('test');
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.verifySetExpirationDatePopup(
        testData.patronGroup.name,
        testData.patronGroup.offsetDays,
        dateFormat,
      );

      // Step 8: click Set and verify field value
      UserEdit.setExpirationDate();
      UserEdit.verifyExpirationDateFieldValue(expectedDate);
    },
  );
});
