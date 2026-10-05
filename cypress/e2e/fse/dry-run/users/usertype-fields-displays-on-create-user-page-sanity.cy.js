import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../../support/fragments/topMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import usersSearchResultsPane from '../../../../support/fragments/users/usersSearchResultsPane';
import getRandomPostfix, {
  getTestEntityValue,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Users', () => {
  const testData = {};
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
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
      PatronGroups.getGroupViaApi({ query: `group="${patronGroup.name}"` }).then((resp) => {
        patronGroup.desc = resp.desc;
        patronGroup.expirationOffsetInDays = resp.expirationOffsetInDays;
        patronGroup.id = resp.id;
      });
    });

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
    cy.allure().logCommandSteps(true);
  });

  after('Deleting created entities', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    Users.deleteViaApi(testData.newUserId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C410760 "User type" field is displayed on create user page (Poppy +) (Thunderjet) (TaaS)',
    { tags: ['dryRun', 'thunderjet', 'C410760'] },
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
        testData.newUserId = id;
      });
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userOne.username);
      Users.verifyUserTypeOnUserDetailsPane('staff');
    },
  );
});
