import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {
    patronGroup: {
      name: getTestEntityValue('groupUserPronouns'),
      description: 'Patron_group_description',
    },
    user: {
      pronouns: '',
    },
    pronouns299Chars:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse id orci sit amet dui pulvinar imperdiet. Proin rhoncus risus ut sem tempus bibendum. Quisque eget elit tempus, vehicula augue quis, consequat turpis. Proin congue pharetra odio, quis scelerisque erat placerat et. Integer quis orc.',
    pronouns300Chars:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse id orci sit amet dui pulvinar imperdiet. Proin rhoncus risus ut sem tempus bibendum. Quisque eget elit tempus, vehicula augue quis, consequat turpis. Proin congue pharetra odio, quis scelerisque erat placerat et. Integer quis orci.',
    pronouns301Chars:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse id orci sit amet dui pulvinar imperdiet. Proin rhoncus risus ut sem tempus bibendum. Quisque eget elit tempus, vehicula augue quis, consequat turpis. Proin congue pharetra odio, quis scelerisque erat placerat et. Integer quis orcil.',
  };
  let patronGroupId;
  let servicePointId;

  before('Data preparation and setup', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
          servicePointId = servicePoint.id;
        });
        PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
          (patronGroupResponse) => {
            patronGroupId = patronGroupResponse;
          },
        );
        cy.createTempUser(
          [permissions.uiUsersCreate.gui, permissions.uiUserEdit.gui, permissions.checkoutAll.gui],
          testData.patronGroup.name,
        ).then((userProperties) => {
          testData.user = userProperties;

          UserEdit.addServicePointViaApi(servicePointId, testData.user.userId, servicePointId);
        });
      })
      .then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
          authRefresh: true,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    if (testData.user.userId) {
      Users.deleteViaApi(testData.user.userId);
    }
    if (patronGroupId) {
      PatronGroups.deleteViaApi(patronGroupId);
    }
  });

  it(
    'C345421 Warning message is shown when "Pronouns" field character limit is reached (volaris)',
    { tags: ['extendedPath', 'volaris', 'C345421'] },
    () => {
      // Step 1 Click "Actions" -> "New" on "Users" app main page
      Users.clickNewButton();
      Users.checkCreateUserPaneOpened();
      UserEdit.verifyPronounsFieldPresent();
      UserEdit.fillLastFirstNames(testData.user.personal.lastName);

      // Step 2 Paste the text containing exactly 300 characters into "Pronouns" field
      UserEdit.fillPronouns(testData.pronouns300Chars);
      UserEdit.verifyPronounsFieldValue(testData.pronouns300Chars);
      UserEdit.verifyPronounsNoError();

      // Step 3 Paste the text containing exactly 301 characters into "Pronouns" field
      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns301Chars);
      UserEdit.verifyPronounsError();

      // Step 4 Remove 1 character from "Pronouns" field
      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns300Chars);
      UserEdit.verifyPronounsNoError();

      // Step 5 Remove 1 more character from "Pronouns" field
      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns299Chars);
      UserEdit.verifyPronounsNoError();

      // Step 6 Fill in rest required fields and click "Save & close" button
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.setExpirationDate();
      UserEdit.fillEmailAddress('test@example.com');
      UserEdit.chooseUserType('Patron');
      UserEdit.saveAndClose();
      UsersCard.waitLoading();
      UsersCard.verifyPronounsWrappedVisible(testData.pronouns299Chars);
      UsersCard.verifyPronounsOnUserDetailsPane(testData.pronouns299Chars);

      // Step 7/8 viewport tests: keep as-is (no fragment available)
      cy.viewport(1920 * 0.6, 1080 * 0.6);
      UsersCard.verifyPronounsWrappedVisible(testData.pronouns299Chars);
      cy.viewport(1920 * 2, 1080 * 2);
      UsersCard.verifyPronounsWrappedVisible(testData.pronouns299Chars);

      // Step 9 Click "Actions" -> "Edit" on user details pane
      UserEdit.openEdit();

      // Step 10 Rescale the screen back to normal
      cy.viewport(1920, 1080);
      UserEdit.verifyPronounsTextVisibleInEdit(testData.pronouns299Chars);

      // Step 11/12 Add  more characters to value in "Pronouns" field
      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns300Chars);
      UserEdit.verifyPronounsNoError();

      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns301Chars);
      UserEdit.verifyPronounsError();

      // Step 13/14/15 Click on "Save & close" button / Remove 1 character from "Pronouns" field / Click on "Save & close" button
      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.verifyPronounsError();

      UserEdit.clearPronounsField();
      UserEdit.fillPronouns(testData.pronouns300Chars);
      UserEdit.verifyPronounsNoError();

      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.closeEditPaneIfExists();
      UsersCard.waitLoading();
      UsersCard.verifyPronounsOnUserDetailsPane(testData.pronouns300Chars);
      UsersCard.verifyPronounsWrappedVisible(testData.pronouns300Chars);
    },
  );
});
