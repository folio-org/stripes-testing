import Permissions from '../../support/dictionary/permissions';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import SelectUser from '../../support/fragments/requests/selectUser';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  const patronModelNoMiddle = Users.generateUserModel();
  const patronModelWithMiddle = Users.generateUserModel();
  let servicePoint;
  let staffUser;
  let patronUserNoMiddle;
  let patronUserWithMiddle;

  before('Create test data', () => {
    delete patronModelNoMiddle.personal.middleName;
    patronModelNoMiddle.type = 'patron';
    patronModelWithMiddle.type = 'patron';

    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
        });
      })
      .then(() => {
        cy.createTempUserParameterized(patronModelNoMiddle, [], { userType: 'patron' }).then(
          (userProperties) => {
            patronUserNoMiddle = { ...patronModelNoMiddle, ...userProperties };
          },
        );
        cy.createTempUserParameterized(patronModelWithMiddle, [], { userType: 'patron' }).then(
          (userProperties) => {
            patronUserWithMiddle = { ...patronModelWithMiddle, ...userProperties };
          },
        );

        // Create staff user with requests + user-edit permissions
        cy.createTempUser([
          Permissions.uiRequestsAll.gui,
          Permissions.uiUserEdit.gui,
          Permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          staffUser = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, staffUser.userId, servicePoint.id);
        });
      })
      .then(() => {
        cy.login(staffUser.username, staffUser.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(patronUserNoMiddle.userId);
    Users.deleteViaApi(patronUserWithMiddle.userId);
    Users.deleteViaApi(staffUser.userId);
  });

  it(
    'C347835 Add preferred name to Requests UI (vega)',
    { tags: ['extendedPath', 'vega', 'C347835'] },
    () => {
      // Step 1: Open New request → Requester look-up → search and select patron without middle name
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.openRequesterLookup();
      SelectUser.verifySelectUserModalExists();
      SelectUser.searchUser(patronUserNoMiddle.username);
      SelectUser.verifyUserFoundInResults(patronUserNoMiddle.username);
      SelectUser.verifyFoundUserContainsPartialName(`${patronUserNoMiddle.personal.lastName}, ${patronUserNoMiddle.personal.preferredFirstName} (${patronUserNoMiddle.personal.firstName})`);
      SelectUser.selectUserFromList(patronUserNoMiddle.username);
      SelectUser.verifySelectUserModalClosed();

      // Step 2: Verify requester section shows Last name, preferred first name (no middle initial)
      NewRequest.verifyRequesterInformation(
        `${patronUserNoMiddle.personal.lastName}, ${patronUserNoMiddle.personal.preferredFirstName}`,
        patronUserNoMiddle.barcode,
      );
      NewRequest.clickCancel();
      NewRequest.closeWithoutSaving();

      // Step 3: Go back to the User's app, and edit the user to have a middle initial or name
      // is already done in the preconditions by creating two users with and without middle names

      // Step 4: Open New request → Requester look-up → search and select patron with middle name
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.openRequesterLookup();
      SelectUser.verifySelectUserModalExists();
      SelectUser.searchUser(patronUserWithMiddle.username);
      SelectUser.verifyUserFoundInResults(patronUserWithMiddle.username);
      SelectUser.verifyFoundUserContainsPartialName(`${patronUserWithMiddle.personal.lastName}, ${patronUserWithMiddle.personal.preferredFirstName} (${patronUserWithMiddle.personal.firstName}) ${patronUserWithMiddle.personal.middleName}`);
      SelectUser.selectUserFromList(patronUserWithMiddle.username);
      SelectUser.verifySelectUserModalClosed();

      // Verify requester section shows Last name, preferred first name, middle name
      NewRequest.verifyRequesterInformation(
        `${patronUserWithMiddle.personal.lastName}, ${patronUserWithMiddle.personal.preferredFirstName} ${patronUserWithMiddle.personal.middleName}`,
        patronUserWithMiddle.barcode,
      );
    },
  );
});
