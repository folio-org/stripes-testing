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
      cy.login(user.username, user.password, {
        path: TopMenu.customFieldsPath,
        waiter: CustomFields.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15693 Create a text field custom field (volaris)',
      {
        tags: ['extendedPath', 'volaris', 'C15693'],
        retries: 2,
      },
      () => {
        const fieldData = {
          fieldLabel: `TF_${getRandomPostfix()}`,
          helpText: `TF_HelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomTextField(fieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.scrollToTheLastCustomField();
        UserEdit.verifyTextFieldPresented(fieldData);
        UserEdit.clickCloseWithoutSavingIfModalExists();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(fieldData.fieldLabel);
      },
    );

    it(
      'C15694 Create a text area custom field and add help text (volaris)',
      {
        tags: ['extendedPath', 'volaris', 'C15694', 'eurekaPhase1'],
        retries: 2,
      },
      () => {
        const fieldData = {
          fieldLabel: `TA_${getRandomPostfix()}`,
          helpText: `TA_HelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomTextArea(fieldData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.scrollToTheLastCustomField();
        UserEdit.verifyAreaFieldPresented(fieldData);
        UserEdit.clickCloseWithoutSavingIfModalExists();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(fieldData.fieldLabel);
      },
    );

    it(
      'C15695 Create a checkbox custom field (volaris)',
      {
        tags: ['extendedPath', 'volaris', 'C15695', 'eurekaPhase1'],
        retries: 2,
      },
      () => {
        const checkboxData = {
          fieldLabel: `CB_${getRandomPostfix()}`,
          helpText: `CB_HelpText_${getRandomPostfix()}`,
        };

        CustomFields.addCustomCheckBox(checkboxData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.scrollToTheLastCustomField();
        UserEdit.verifyCheckboxPresented(checkboxData);
        UserEdit.clickCloseWithoutSavingIfModalExists();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(checkboxData.fieldLabel);
      },
    );

    it(
      'C15696 Create a radio button custom field (volaris)',
      {
        tags: ['extendedPath', 'volaris', 'C15696', 'eurekaPhase1'],
        retries: 2,
      },
      () => {
        const radioButtonData = {
          data: {
            fieldLabel: `RB_${getRandomPostfix()}`,
            helpText: `RB_HelpText_${getRandomPostfix()}`,
            label1: `RB_Radio1_${getRandomPostfix()}`,
            label2: `RB_Radio2_${getRandomPostfix()}`,
          },
        };

        CustomFields.addCustomRadioButton(radioButtonData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.scrollToTheLastCustomField();
        UserEdit.verifyRadioButtonPresented(radioButtonData);
        UserEdit.clickCloseWithoutSavingIfModalExists();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.deleteCustomField(radioButtonData.data.fieldLabel);
      },
    );

    it(
      'C15697 Create a single select custom field (volaris)',
      {
        tags: ['extendedPath', 'volaris', 'C15697', 'eurekaPhase1'],
        retries: 2,
      },
      () => {
        const singleSelectData = {
          data: {
            fieldLabel: `SS_${getRandomPostfix()}`,
            helpText: `SS_HelpText_${getRandomPostfix()}`,
            firstLabel: `SS_FirstLabel_${getRandomPostfix()}`,
            secondLabel: `SS_SecondLabel_${getRandomPostfix()}`,
          },
        };

        CustomFields.addCustomSingleSelect(singleSelectData);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByKeywords(user.username);
        UserEdit.openEdit();
        UserEdit.scrollToTheLastCustomField();
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
