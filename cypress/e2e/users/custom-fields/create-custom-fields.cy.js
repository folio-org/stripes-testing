import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';

let user;

describe('ui-users: Custom Fields', () => {
  before('login', () => {
    cy.createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUserEdit.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      },
    );
  });

  // after('delete test data', () => {
  //   Users.deleteViaApi(user.userId);
  // });

  // it(
  //   'C15693 Create a text field custom field (volaris)',
  //   { tags: [TestTypes.extendedPath, DevTeams.volaris] },
  //   () => {
  //     const fieldData = {
  //       fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
  //       helpText: `autotestHelpText_${getRandomPostfix()}`,
  //     };

  //     cy.visit(TopMenu.customFieldsPath);
  //     CustomFields.addCustomTextField(fieldData);
  //     cy.visit(TopMenu.usersPath);
  //     UsersSearchPane.searchByKeywords(user.username);
  //     UserEdit.openEdit();
  //     UserEdit.verifyTextFieldPresented(fieldData);

  //     cy.visit(SettingsMenu.customFieldsPath);
  //     CustomFields.deleteCustomField(fieldData.fieldLabel);
  //   },
  // );

  // it(
  //   'C15694 Create a text area custom field and add help text (volaris)',
  //   { tags: [TestTypes.extendedPath, DevTeams.volaris] },
  //   () => {
  //     const fieldData = {
  //       fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
  //       helpText: `autotestHelpText_${getRandomPostfix()}`,
  //     };

  //     cy.visit(TopMenu.customFieldsPath);
  //     CustomFields.addCustomTextArea(fieldData);
  //     cy.visit(TopMenu.usersPath);
  //     UsersSearchPane.searchByKeywords(user.username);
  //     UserEdit.openEdit();
  //     UserEdit.verifyAreaFieldPresented(fieldData);

  //     cy.visit(SettingsMenu.customFieldsPath);
  //     CustomFields.deleteCustomField(fieldData.fieldLabel);
  //   },
  // );

  it(
    'C15701 Change custom fields order (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.editButton();
      UsersSearchPane.dragAndDropCustomFields();
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UsersCard.openCustomFieldsSection();
    },
  );
});
