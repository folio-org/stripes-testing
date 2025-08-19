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
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Settings (Users)', () => {
    const testData = {
      user: {},
      patronGroup: {
        name: `group name${getRandomPostfix()}`,
        currentDate: moment(new Date()).format('M/D/YYYY'),
        userName: '',
      },
      isButtonDisabled: false,
      errorMessage: 'Please fill this in to continue',
      newPatronGroup: {
        name: `group name${getRandomPostfix()}`,
        description: `description ${getRandomPostfix()}`,
        expirationDateOffset: '4',
        currentDate: moment(new Date()).format('M/D/YYYY'),
      },
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.getAdminSourceRecord().then((sourceRecord) => {
        testData.patronGroup.userName = sourceRecord;
      });
      PatronGroups.createViaApi(testData.patronGroup.name).then(() => {
        PatronGroups.getGroupViaApi({ query: `group="${testData.patronGroup.name}"` }).then(
          (resp) => {
            testData.patronGroup.desc = resp.desc;
            testData.patronGroup.expirationOffsetInDays = resp.expirationOffsetInDays;
            testData.patronGroup.id = resp.id;
          },
        );
      });

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
      PatronGroups.deleteViaApi(testData.patronGroup.id);
    });

    // https://folio-org.atlassian.net/browse/UIU-3189
    it('C514937 Edit patron groups (volaris)', { tags: ['smoke', 'volaris', 'C514937'] }, () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.USERS);
      UsersSettingsGeneral.checkUserSectionOptionExists('Patron groups');
      SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
      PatronGroups.waitLoading();
      PatronGroups.verifyPatronGroupsPane(testData.isButtonDisabled);
      PatronGroups.clickEditButtonForGroup(testData.patronGroup.name);
      PatronGroups.verifyEditedGroupInTheList(testData.patronGroup);

      PatronGroups.clearField('Patron group', testData.patronGroup);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, true);
      PatronGroups.fillPatronGroupName(testData.newPatronGroup.name);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, testData.isButtonDisabled);

      PatronGroups.clearField('Description', testData.patronGroup);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, testData.isButtonDisabled);
      PatronGroups.fillDescription(testData.newPatronGroup.description);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, testData.isButtonDisabled);

      PatronGroups.clearField('Expiration date offset', testData.patronGroup);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, testData.isButtonDisabled);
      PatronGroups.fillExpirationDateOffset(testData.newPatronGroup.expirationDateOffset);
      PatronGroups.verifyWarningMessageForField(testData.errorMessage, testData.isButtonDisabled);

      PatronGroups.clickSaveButton();
      InteractorsTools.checkCalloutMessage(
        `The Patron group ${testData.newPatronGroup.name} was successfully updated`,
      );
      PatronGroups.verifyCreatedGroupInTheList({
        name: testData.newPatronGroup.name,
        description: testData.newPatronGroup.description,
        expirationDateOffset: testData.newPatronGroup.expirationDateOffset,
        date: testData.newPatronGroup.currentDate,
        // userName: `${testData.user.lastName}, ${testData.user.firstName}`,
        actions: ['edit', 'trash'],
      });
    });
  });
});
