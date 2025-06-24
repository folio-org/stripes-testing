import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    before('login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
        },
      );
    });

    beforeEach(() => {
      cy.login(user.username, user.password,
        { path: TopMenu.customFieldsPath, waiter: CustomFields.waitLoading });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15693 Create a text field custom field (volaris)',
      { tags: ['extendedPath', 'volaris', 'C15693'] },
      () => {
        const fieldData = {
          fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
          helpText: `autotestHelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomTextField(fieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.verifyTextFieldPresented(fieldData);
        UserEdit.cancelEdit();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(fieldData.fieldLabel);
      },
    );

    it(
      'C15694 Create a text area custom field and add help text (volaris)',
      { tags: ['extendedPath', 'volaris', 'C15694', 'eurekaPhase1'] },
      () => {
        const fieldData = {
          fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
          helpText: `autotestHelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomTextArea(fieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.verifyAreaFieldPresented(fieldData);
        UserEdit.cancelEdit();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(fieldData.fieldLabel);
      },
    );

    it(
      'C15695 Create a checkbox custom field (volaris)',
      { tags: ['extendedPath', 'volaris', 'C15695', 'eurekaPhase1'] },
      () => {
        const checkboxData = {
          fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
          helpText: `autotestHelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomCheckBox(checkboxData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.verifyCheckboxPresented(checkboxData);
        UserEdit.cancelEdit();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(checkboxData.fieldLabel);
      },
    );

    it(
      'C15696 Create a radio button custom field (volaris)',
      { tags: ['extendedPath', 'volaris', 'C15696', 'eurekaPhase1'] },
      () => {
        const radioButtonData = {
          data: {
            fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
            helpText: `autotestHelpText_${getRandomPostfix()}`,
            label1: `autotestRadio1_${getRandomPostfix()}`,
            label2: `autotestRadio2_${getRandomPostfix()}`,
          },
        };

        CustomFields.addCustomRadioButton(radioButtonData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.verifyRadioButtonPresented(radioButtonData);
        UserEdit.cancelEdit();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(radioButtonData.data.fieldLabel);
      },
    );

    it(
      'C15697 Create a single select custom field (volaris)',
      { tags: ['extendedPath', 'volaris', 'C15697', 'eurekaPhase1'] },
      () => {
        const singleSelectData = {
          data: {
            fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
            helpText: `autotestHelpText_${getRandomPostfix()}`,
            firstLabel: `autotestFirstLabel_${getRandomPostfix()}`,
            secondLabel: `autotestSecondLabel_${getRandomPostfix()}`,
          },
        };

        CustomFields.addCustomSingleSelect(singleSelectData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.verifySingleSelectPresented(singleSelectData);
        UserEdit.selectSingleSelectValue(singleSelectData);
        UserEdit.saveAndClose();
        UsersCard.openCustomFieldsSection();
        UsersCard.verifySingleSelectValue(singleSelectData);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(singleSelectData.data.fieldLabel);
      },
    );
  });
});
