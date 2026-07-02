import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Custom Fields (Users)', { retries: { runMode: 2 } }, () => {
    let user;
    const fieldData = {
      fieldLabel: `autotest_${getRandomPostfix()}`,
      helpText: `autotestHelpText_${getRandomPostfix()}`,
    };

    const singleSelectData = {
      data: {
        fieldLabel: `autotestSingleSelectLabel_${getRandomPostfix()}`,
        helpText: `autotestHelpText_${getRandomPostfix()}`,
        firstLabel: `autotestFirstLabel_${getRandomPostfix()}`,
        secondLabel: `autotestSecondLabel_${getRandomPostfix()}`,
      },
    };
    const checkboxData = {
      fieldLabel: `autotestFieldLabel_${getRandomPostfix()}`,
      helpText: `autotestHelpText_${getRandomPostfix()}`,
    };
    before('Create test data', () => {
      cy.createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUsersCreate.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C418594 Verify that final custom field can be removed (volaris) (TaaS)',
      { tags: ['extendedPath', 'volaris', 'C418594', 'eurekaPhase1'] },
      () => {
        CustomFields.openTabFromInventorySettingsList();
        CustomFields.addCustomTextField(fieldData);
        CustomFields.addCustomCheckBox(checkboxData);
        CustomFields.addCustomSingleSelect(singleSelectData);
        CustomFields.deleteCustomField(fieldData.fieldLabel);
        CustomFields.verifyDeletedCustomFields(fieldData);
        CustomFields.deleteCustomField(singleSelectData.data.fieldLabel);
        CustomFields.verifyDeletedCustomFields(singleSelectData);
        CustomFields.deleteCustomField(checkboxData.fieldLabel);
        CustomFields.verifyDeletedCustomFields(checkboxData);
      },
    );
  });
});
