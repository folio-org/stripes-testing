import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Profile pictures', () => {
    const testData = {
      externalPictureUrl:
        'https://upload.wikimedia.org/wikipedia/commons/7/70/User_icon_BLACK-01.png',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.getConfigurationsEntry().then((respBody) => {
        if (respBody.enabled === false) {
          respBody.enabled = true;
          cy.updateConfigurationsEntry(respBody.id, respBody);
        }
      });

      // create user B
      cy.createTempUser().then((userProperties) => {
        testData.userB = userProperties;
        UserEdit.addProfilePictureViaApi(testData.userB.userId, testData.externalPictureUrl);
      });

      // create user C
      cy.createTempUser().then((userProperties) => {
        testData.userC = userProperties;
      });

      // create user A
      cy.createTempUser([Permissions.uiUserViewEditDeliteProfilePictores.gui]).then(
        (userProperties) => {
          testData.userA = userProperties;

          cy.login(testData.userA.username, testData.userA.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        },
      );
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      Users.deleteViaApi(testData.userC.userId);
    });

    it(
      'C442795 Verify that profile picture and associated update options display appropriately with Users: Can view, edit, and delete profile pictures (volaris)',
      { tags: ['smoke', 'volaris', 'C442795'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        cy.wait(2000);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        UserEdit.verifyButtonsStateForProfilePicture([
          { value: 'Local file' },
          { value: 'External URL' },
          { value: 'Delete' },
        ]);
        UserEdit.clickCloseWithoutSavingIfModalExists();
        UsersCard.waitLoading();

        UsersSearchPane.searchByUsername(testData.userC.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyPlaceholderProfilePictureIsPresent();
        UserEdit.verifyButtonsStateForProfilePicture([
          { value: 'Local file' },
          { value: 'External URL' },
        ]);
      },
    );
  });
});
