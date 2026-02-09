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
      'C446093 Update profile picture via local storage (volaris)',
      { tags: ['smoke', 'volaris', 'C446093'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyPlaceholderProfilePictureIsPresent();
        UserEdit.verifyButtonsStateForProfilePicture([{ value: 'Local file' }]);
        // steps 10-11 we can't automate
        UserEdit.setPictureFromExternalUrl(testData.externalPictureUrl);
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        cy.wait(3000);
        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        // UsersCard.verifyProfilePictureIsPresent(testData.externalPictureUrl);
      },
    );
  });
});
