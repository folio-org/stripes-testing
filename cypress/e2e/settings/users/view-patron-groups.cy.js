import Permissions from '../../../support/dictionary/permissions';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Settings (Users)', () => {
    const testData = {
      user: {},
      firstPatronGroup: {
        name: `a_groupName ${getRandomPostfix()}`,
        id: null,
      },
      secondPatronGroup: {
        name: `b_groupName ${getRandomPostfix()}`,
        id: null,
      },
      isNewButtonDisabled: true,
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      PatronGroups.createViaApi(testData.firstPatronGroup.name).then((patronGroupResponse) => {
        testData.firstPatronGroup.id = patronGroupResponse;
      });
      PatronGroups.createViaApi(testData.secondPatronGroup.name).then((patronGroupResponse) => {
        testData.secondPatronGroup.id = patronGroupResponse;
      });

      cy.createTempUser([Permissions.uiUsersViewPatronGroups.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        cy.visit(SettingsMenu.usersPath);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      PatronGroups.deleteViaApi(testData.firstPatronGroup.id);
      PatronGroups.deleteViaApi(testData.secondPatronGroup.id);
    });

    it('C514997 View patron groups (volaris)', { tags: ['smoke', 'volaris'] }, () => {
      UsersSettingsGeneral.checkUserSectionOptionExists('Patron groups');
      cy.visit(SettingsMenu.patronGroups);
      PatronGroups.waitLoading();
      PatronGroups.verifyPatronGroupsSortingOrder();
      PatronGroups.verifyPatronGroupsPane(testData.isNewButtonDisabled);
      PatronGroups.verifyActionsCells();
    });
  });
});