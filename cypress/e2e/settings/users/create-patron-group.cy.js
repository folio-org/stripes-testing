import moment from 'moment';
import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsUsers, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/users/settingsUsers';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Settings (Users)', () => {
    const testData = {
      user: {},
      groupName: `name${getRandomPostfix()}`,
      groupDescription: `description${getRandomPostfix()}`,
      warningMessageForGroupNameField: 'Please fill this in to continue',
      expirationDateOffsetData: {
        specialCharacterValue: '%',
        decimalNumberValue: '4.6',
        negativeNumberValue: '-4',
        integerValue: '2',
        warningMessage: 'Must be empty or an integer > 0',
      },
      currentDate: moment(new Date()).format('M/D/YYYY'),
    };

    before('Create user and login', () => {
      cy.createTempUser([Permissions.uiUsersCreateEditRemovePatronGroups.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password);
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    // https://folio-org.atlassian.net/browse/UIU-3189
    it('C514932 Create patron group (volaris)', { tags: ['smoke', 'volaris', 'C514932'] }, () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.USERS);
      UsersSettingsGeneral.checkUserSectionOptionExists('Patron groups');
      SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
      PatronGroups.waitLoading();
      PatronGroups.verifyPatronGroupsPane();
      PatronGroups.clickNewButton();
      PatronGroups.verifyNewRowForGroupInTheList();
      PatronGroups.fillPatronGroupName(testData.groupName);
      PatronGroups.clickCancelButton();
      PatronGroups.verifyGroupAbsentInTheList(testData.groupName);

      PatronGroups.clickNewButton();
      PatronGroups.verifyNewRowForGroupInTheList();
      PatronGroups.fillDescription(testData.groupDescription);
      PatronGroups.verifyWarningMessageForField(testData.warningMessageForGroupNameField, true);
      PatronGroups.fillPatronGroupName(testData.groupName);
      PatronGroups.verifyWarningMessageForField(testData.warningMessageForGroupNameField, false);

      PatronGroups.fillExpirationDateOffset(
        testData.expirationDateOffsetData.specialCharacterValue,
      );
      PatronGroups.verifyWarningMessageForField(
        testData.expirationDateOffsetData.warningMessage,
        true,
      );
      PatronGroups.fillExpirationDateOffset(testData.expirationDateOffsetData.decimalNumberValue);
      PatronGroups.verifyWarningMessageForField(
        testData.expirationDateOffsetData.warningMessage,
        true,
      );
      PatronGroups.fillExpirationDateOffset(testData.expirationDateOffsetData.negativeNumberValue);
      PatronGroups.verifyWarningMessageForField(
        testData.expirationDateOffsetData.warningMessage,
        true,
      );
      PatronGroups.fillExpirationDateOffset(testData.expirationDateOffsetData.integerValue);
      PatronGroups.verifyWarningMessageForField(
        testData.expirationDateOffsetData.warningMessage,
        false,
      );

      PatronGroups.clickSaveButton();
      PatronGroups.verifyCreatedGroupInTheList({
        name: testData.groupName,
        description: testData.groupDescription,
        expirationDateOffset: testData.expirationDateOffsetData.integerValue,
        date: testData.currentDate,
        // userName: `${testData.user.lastName}, ${testData.user.firstName}`,
        actions: ['edit', 'trash'],
      });
      PatronGroups.deletePatronGroupViaTrashButton(testData.groupName);
    });
  });
});
