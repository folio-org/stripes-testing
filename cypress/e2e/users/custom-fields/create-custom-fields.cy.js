import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

let user;
const fieldData = {
  fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
  helpText: `autotestHelpText_${getRandomPostfix()}`,
};

describe('ui-users: Custom Fields', () => {
  before('login', () => {
    cy.createTempUser([
      Permissions.uiUsersCustomField.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.customFieldsPath,
        waiter: CustomFields.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.visit(SettingsMenu.customFieldsPath);
    CustomFields.deleteCustomField(fieldData.fieldLabel);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15693 Create a text field custom field (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      CustomFields.addCustomTextField(fieldData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openUserEdit();
      UserEdit.verifyCustomFieldPresented(fieldData);
    },
  );
});
