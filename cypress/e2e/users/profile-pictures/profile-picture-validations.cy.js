import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import ProfileCard from '../../../support/fragments/users/profilePicture';

describe('Users', () => {
  describe('Profile pictures', () => {
    let testUser = {};

    before('Preconditions', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.uiUserEdit.gui, permissions.uiUsersPermissionsView.gui])
        .then((userProperties) => {
          testUser = userProperties;
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
    });

    it(
      'C446093 Update profile picture via local storage or external Url (volaris)',
      { tags: ['smokeBroken', 'volaris'] },
      () => {
        UsersSearchPane.searchByUsername(testUser.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        ProfileCard.verifyProfileCardIsPresent();
        ProfileCard.expandUpdateDropDown();
        ProfileCard.verifyLocalUploadButtonIsPresent();
        ProfileCard.setPictureFromExternalUrl();
        ProfileCard.verifyPictureIsSet();
      },
    );

    it(
      'C442795, C442796 Verify that profile picture and associated update options display appropriately with Users: Can view, edit, and delete profile pictures',
      { tags: ['smokeBroken', 'volaris'] },
      () => {
        UsersSearchPane.searchByUsername(testUser.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        ProfileCard.verifyProfileCardIsPresent();
        ProfileCard.expandUpdateDropDown();
        ProfileCard.deleteProfilePicture();
        ProfileCard.verifyPictureIsRemoved();
      },
    );
  });
});
