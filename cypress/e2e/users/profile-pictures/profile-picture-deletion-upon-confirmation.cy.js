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
    });

    it(
      'C446007 Verify Profile Picture Deletion Upon Confirmation (volaris)',
      { tags: ['smoke', 'volaris', 'C446007'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        UserEdit.verifyButtonsStateForProfilePicture([{ value: 'Delete' }]);
        UserEdit.deleteProfilePicture(testData.userB);
        UserEdit.verifyPictureIsRemoved(testData.externalPictureUrl);
        UserEdit.saveAndClose();
        UsersCard.verifyProfilePictureRemoved();
      },
    );
  });
});
