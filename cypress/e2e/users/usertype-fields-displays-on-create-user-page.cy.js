import { Permissions } from '../../support/dictionary';
import getRandomPostfix, {
  getTestEntityValue,
  randomFourDigitNumber,
} from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import usersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

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
    username: `AutotestUser_${barcodeNumber}`,
    personal: {
      lastName: 'User',
      firstName: 'Delete',
      email: `tom${randomFourDigitNumber()}@yopmail.com`,
    },
  };
  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [
          Permissions.uiUsersPermissions.gui,
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
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      usersSearchResultsPane.openNewUser();
      UserEdit.verifySaveAndColseIsDisabled(true);
      UserEdit.verifyCancelIsDisable(false);
      UserEdit.verifyUserInformation(['User type', 'Select user type']);
      UserEdit.verifyUserTypeItems();
      UserEdit.chooseRequestType('Staff');
      UserEdit.verifySaveAndColseIsDisabled(false);
      UserEdit.enterValidValueToCreateViaUi(userOne).then((id) => {
        newUserId = id;
      });
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userOne.username);
      Users.verifyUserTypeOnUserDetailsPane('staff');
    },
  );
});
