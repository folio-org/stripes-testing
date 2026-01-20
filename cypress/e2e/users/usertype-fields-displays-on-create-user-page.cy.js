import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import usersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import getRandomPostfix, {
  getTestEntityValue,
  randomFourDigitNumber,
} from '../../support/utils/stringTools';

describe('Users', () => {
  let userData;
  let servicePointId;
  let newUserId;
  const patronGroup = {
    name: getTestEntityValue('groupUserChange'),
  };
  const barcodeNumber = getRandomPostfix();
  const userOne = {
    patronGroup: patronGroup.name,
    barcode: barcodeNumber,
    username: `autotestuser_${barcodeNumber}`,
    personal: {
      lastName: 'User',
      firstName: 'Delete',
      email: `tom${randomFourDigitNumber()}@yopmail.com`,
    },
  };
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });

      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
        PatronGroups.getGroupViaApi({ query: `group="${patronGroup.name}"` }).then((resp) => {
          patronGroup.desc = resp.desc;
          patronGroup.expirationOffsetInDays = resp.expirationOffsetInDays;
          patronGroup.id = resp.id;
        });
      });

      cy.createTempUser(
        [
          Permissions.uiUserCanAssignUnassignPermissions.gui,
          Permissions.uiUsersPermissionsView.gui,
          Permissions.uiUsersCreate.gui,
          Permissions.uiUsersCreateResetPassword.gui,
        ],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(newUserId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C410760 "User type" field is displayed on create user page (Poppy +) (Thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C410760'] },
    () => {
      usersSearchResultsPane.openNewUser();
      UserEdit.verifySaveAndCloseIsDisabled(true);
      UserEdit.verifyCancelIsDisable(false);
      UserEdit.verifyUserInformation(['User type', 'Select user type']);
      UserEdit.verifyUserTypeItems();
      UserEdit.chooseUserType('Staff');
      UserEdit.verifySaveAndCloseIsDisabled(false);
      UserEdit.enterValidValueToCreateViaUi(
        userOne,
        `${patronGroup.name} (${patronGroup.desc})`,
      ).then((id) => {
        newUserId = id;
      });
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userOne.username);
      Users.verifyUserTypeOnUserDetailsPane('staff');
    },
  );
});
