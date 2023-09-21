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

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15693 Create a text field custom field (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      const fieldData = {
        fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
        helpText: `autotestHelpText_${getRandomPostfix()}`,
      };

      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomTextField(fieldData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openEdit();
      UserEdit.verifyTextFieldPresented(fieldData);

      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(fieldData.fieldLabel);
    },
  );

  it(
    'C15694 Create a text area custom field and add help text (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      const fieldData = {
        fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
        helpText: `autotestHelpText_${getRandomPostfix()}`,
      };

      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomTextArea(fieldData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openEdit();
      UserEdit.verifyAreaFieldPresented(fieldData);

      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(fieldData.fieldLabel);
    },
  );

  it(
    'C15695 Create a checkbox custom field (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      const checkboxData = {
        fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
        helpText: `autotestHelpText_${getRandomPostfix()}`,
      };
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomCheckBox(checkboxData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openEdit();
      UserEdit.verifyCheckboxPresented(checkboxData);

      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(checkboxData.fieldLabel);
    },
  );

  it(
    'C15696 Create a radio button custom field (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      const radioButtonData = {
        data: {
          fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
          helpText: `autotestHelpText_${getRandomPostfix()}`,
          label1: `autotestRadio1_${getRandomPostfix()}`,
          label2: `autotestRadio2_${getRandomPostfix()}`,
        },
      };

      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomRadioButton(radioButtonData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openEdit();
      UserEdit.verifyRadioButtonPresented(radioButtonData);

      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(radioButtonData.data.fieldLabel);
    },
  );

  it(
    'C15697 Create a single select custom field (volaris)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      const singleSelectData = {
        data: {
          fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
          helpText: `autotestHelpText_${getRandomPostfix()}`,
          firstLabel: `autotestFirstLabel_${getRandomPostfix()}`,
          secondLabel: `autotestSecondLabel_${getRandomPostfix()}`,
        },
      };

      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomSingleSelect(singleSelectData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(user.username);
      UserEdit.openEdit();
      UserEdit.verifySingleSelectPresented(singleSelectData);
      UserEdit.selectSingleSelectValue(singleSelectData);
      UserEdit.saveAndClose();
      UsersCard.openCustomFieldsSection();
      UsersCard.verifySingleSelectValue(singleSelectData);

      cy.visit(SettingsMenu.customFieldsPath);
      CustomFields.deleteCustomField(singleSelectData.data.fieldLabel);
    },
  );
});
