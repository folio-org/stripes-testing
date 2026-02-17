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
        'https://png.pngtree.com/png-vector/20191101/ourmid/pngtree-cartoon-color-simple-male-avatar-png-image_1934459.jpg',
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
      cy.createTempUser([Permissions.uiUserViewProfilePictores.gui]).then((userProperties) => {
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
      'C442805 Verify that profile picture displays on user record for users with Users: Can view profile pictures (volaris)',
      { tags: ['smoke', 'volaris', 'C442805'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersCard.waitLoading();
        // UsersCard.verifyProfilePictureIsPresent(testData.externalPictureUrl);

        UsersSearchPane.searchByUsername(testData.userC.username);
        UsersCard.waitLoading();
        UsersCard.verifyPlaceholderProfilePictureIsPresent();
      },
    );
  });
});
