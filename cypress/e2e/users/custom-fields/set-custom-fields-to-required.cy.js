import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import {
  generateCheckboxCustomFieldData,
  generateDatePickerCustomFieldData,
  generateMultiSelectCustomFieldData,
  generateRadioButtonCustomFieldData,
  generateSingleSelectCustomFieldData,
  generateTextAreaCustomFieldData,
  generateTextFieldCustomFieldData,
} from '../../../support/utils/customFields';

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    const testNumber = 'C15699';
    const testData = {
      customFields: {
        checkbox: generateCheckboxCustomFieldData({ testNumber }),
        datePicker: generateDatePickerCustomFieldData({ testNumber }),
        multiSelect: generateMultiSelectCustomFieldData({ testNumber }),
        radioButton: generateRadioButtonCustomFieldData({ testNumber }),
        singleSelect: generateSingleSelectCustomFieldData({ testNumber }),
        textArea: generateTextAreaCustomFieldData({ testNumber }),
        textField: generateTextFieldCustomFieldData({ testNumber }),
      },
    };

    const allCustomFieldLabels = [
      testData.customFields.checkbox.name,
      testData.customFields.datePicker.name,
      testData.customFields.multiSelect.name,
      testData.customFields.radioButton.name,
      testData.customFields.singleSelect.name,
      testData.customFields.textArea.name,
      testData.customFields.textField.name,
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          return ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint.id;

            return cy
              .createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUsersCreate.gui])
              .then((userProperties) => {
                testData.user = userProperties;

                return UserEdit.addServicePointViaApi(
                  testData.servicePointId,
                  testData.user.userId,
                  testData.servicePointId,
                );
              });
          });
        })
        .then(() => {
          return cy
            .createCustomFieldsViaApi(Object.values(testData.customFields))
            .then((createdCustomFields) => {
              testData.createdCustomFields = createdCustomFields;
            });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.customFieldsPath,
            waiter: CustomFields.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      const customFieldIds = testData.createdCustomFields?.map(({ id }) => id) || [];
      cy.deleteCustomFieldsViaApi({ ids: customFieldIds });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15699 - Set custom fields to required',
      { tags: ['extendedPath', 'volaris', 'C15699'] },
      () => {
        // Step 1: Open the custom fields settings pane
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 2: Open the edit custom fields pane and verify all custom fields are present
        CustomFields.openEdit();
        CustomFields.verifyEditCustomFieldsPaneIsOpen();
        CustomFields.verifyCustomFieldsPresent(allCustomFieldLabels);

        // Step 3: Expand the Checkbox custom field and verify the Required option is absent
        CustomFields.expandCustomFieldInEditPane(testData.customFields.checkbox.name);
        CustomFields.verifyRequiredOptionVisible(testData.customFields.checkbox.name, false);

        // Step 4: Expand the Date picker custom field and verify the Required option is present
        CustomFields.expandCustomFieldInEditPane(testData.customFields.datePicker.name);
        CustomFields.verifyRequiredOptionVisible(testData.customFields.datePicker.name);

        // Step 5: Set the Date picker custom field as required
        CustomFields.setRequiredOption(testData.customFields.datePicker.name);
        CustomFields.verifySaveAndCloseButtonEnabled();

        // Step 6: Expand the Multi-select custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.multiSelect.name);
        CustomFields.setRequiredOption(testData.customFields.multiSelect.name);

        // Step 7: Expand the Radio button set custom field and verify the Required option is absent
        CustomFields.expandCustomFieldInEditPane(testData.customFields.radioButton.name);
        CustomFields.verifyRequiredOptionVisible(testData.customFields.radioButton.name, false);

        // Step 8: Expand the Single select custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.singleSelect.name);
        CustomFields.setRequiredOption(testData.customFields.singleSelect.name);

        // Step 9: Expand the Text area custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.textArea.name);
        CustomFields.setRequiredOption(testData.customFields.textArea.name);

        // Step 10: Expand the Text field custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.textField.name);
        CustomFields.setRequiredOption(testData.customFields.textField.name);

        // Step 11: Save changes and verify the Custom fields pane is displayed again
        CustomFields.saveAndClose();

        // Step 12: Verify the required value is set to Yes for every required custom field
        CustomFields.expandCustomFieldInViewPane(testData.customFields.datePicker.name);
        CustomFields.verifyRequiredValue(testData.customFields.datePicker.name);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.multiSelect.name);
        CustomFields.verifyRequiredValue(testData.customFields.multiSelect.name);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.singleSelect.name);
        CustomFields.verifyRequiredValue(testData.customFields.singleSelect.name);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.textArea.name);
        CustomFields.verifyRequiredValue(testData.customFields.textArea.name);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.textField.name);
        CustomFields.verifyRequiredValue(testData.customFields.textField.name);

        // Step 13: Open the create user page and verify all custom fields and required markers
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.waitLoading();
        Users.clickNewButton();
        Users.checkCreateUserPaneOpened();

        UserEdit.verifyCheckboxCustomFieldExists(testData.customFields.checkbox.name);
        UserEdit.verifyRadioButtonCustomFieldExists(testData.customFields.radioButton.name);

        UserEdit.verifyDatePickerCustomFieldRequired(testData.customFields.datePicker.name);
        UserEdit.verifyMultiSelectCustomFieldRequired(testData.customFields.multiSelect.name);
        UserEdit.verifySingleSelectCustomFieldRequired(testData.customFields.singleSelect.name);
        UserEdit.verifyTextAreaCustomFieldRequired(testData.customFields.textArea.name);
        UserEdit.verifyTextFieldCustomFieldRequired(testData.customFields.textField.name);
      },
    );
  });
});
