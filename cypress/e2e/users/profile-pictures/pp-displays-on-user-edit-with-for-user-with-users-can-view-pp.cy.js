import { enableProfilePictures } from '../../../support/fragments/users/profilePicture';
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
      enableProfilePictures();

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
      cy.createTempUser([
        Permissions.uiUserEdit.gui,
        Permissions.uiUserViewProfilePictores.gui,
      ]).then((userProperties) => {
        testData.userA = userProperties;

        cy.login(testData.userA.username, testData.userA.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      Users.deleteViaApi(testData.userC.userId);
    });

    it(
      'C442796 Verify that profile picture displays on user edit with for user with Users: Can view profile pictures (volaris)',
      { tags: ['smoke', 'volaris', 'C442796'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        cy.wait(2000);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        UserEdit.clickCloseWithoutSavingIfModalExists();
        UsersCard.waitLoading();

        cy.wait(2000);
        UsersSearchPane.searchByUsername(testData.userC.username);
        UsersCard.waitLoading();
        UsersCard.verifyPlaceholderProfilePictureIsPresent();
      },
    );
  });
});
