import Permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
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
    const testNumber = 'C15700';
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
      'C15700 - Set a default value for the following custom fields: Radio button, Single select, Multi-select',
      { tags: ['extendedPath', 'volaris', 'C15700'] },
      () => {
        const multiSelectDefaults =
          testData.customFields.multiSelect.selectField.options.values.map(
            (option) => option.value,
          );
        const radioButtonDefault =
          testData.customFields.radioButton.selectField.options.values[1].value;
        const singleSelectDefault =
          testData.customFields.singleSelect.selectField.options.values[1].value;

        // Step 1: Open the custom fields settings pane
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 2: Open the edit custom fields pane
        CustomFields.openEdit();
        CustomFields.verifyEditCustomFieldsPaneIsOpen();
        CustomFields.verifyCustomFieldsPresent(allCustomFieldLabels);

        // Step 3: Expand the Multi-select custom field
        CustomFields.expandCustomFieldInEditPane(testData.customFields.multiSelect.name);
        CustomFields.verifyDefaultCheckboxesVisible(
          testData.customFields.multiSelect.name,
          multiSelectDefaults,
        );

        // Step 4: Set default values for the Multi-select custom field
        CustomFields.setMultiSelectDefaults(
          testData.customFields.multiSelect.name,
          multiSelectDefaults,
        );
        CustomFields.verifySaveAndCloseButtonEnabled();

        // Step 5: Set a default value for the Radio button set custom field
        CustomFields.expandCustomFieldInEditPane(testData.customFields.radioButton.name);
        CustomFields.setRadioButtonDefault(
          testData.customFields.radioButton.name,
          radioButtonDefault,
        );

        // Step 6: Set a default value for the Single select custom field
        CustomFields.expandCustomFieldInEditPane(testData.customFields.singleSelect.name);
        CustomFields.setSingleSelectDefault(
          testData.customFields.singleSelect.name,
          singleSelectDefault,
        );

        // Step 7: Save changes and return to the custom fields pane
        CustomFields.saveAndClose();

        // Step 8: Verify the saved default values in the view pane
        CustomFields.expandCustomFieldInViewPane(testData.customFields.multiSelect.name);
        CustomFields.verifyMultiSelectDefaults(
          testData.customFields.multiSelect.name,
          multiSelectDefaults,
        );
        CustomFields.expandCustomFieldInViewPane(testData.customFields.radioButton.name);
        CustomFields.verifyRadioButtonDefault(
          testData.customFields.radioButton.name,
          radioButtonDefault,
        );
        CustomFields.expandCustomFieldInViewPane(testData.customFields.singleSelect.name);
        CustomFields.verifySingleSelectDefault(
          testData.customFields.singleSelect.name,
          singleSelectDefault,
        );

        // Step 9: Open the create user page and verify the configured defaults
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        Users.clickNewButton();
        Users.checkCreateUserPaneOpened();
        UserEdit.verifyCheckboxCustomFieldExists(testData.customFields.checkbox.name);
        UserEdit.verifyDatePickerCustomFieldExists(testData.customFields.datePicker.name);
        UserEdit.verifyMultiSelectCustomFieldExists(testData.customFields.multiSelect.name);
        UserEdit.verifyRadioButtonCustomFieldExists(testData.customFields.radioButton.name);
        UserEdit.verifySingleSelectCustomFieldExists(testData.customFields.singleSelect.name);
        UserEdit.verifyTextAreaCustomFieldExists(testData.customFields.textArea.name);
        UserEdit.verifyTextFieldCustomFieldExists(testData.customFields.textField.name);
        UserEdit.verifyMultiSelectCustomFieldDefaultValues(
          testData.customFields.multiSelect.name,
          multiSelectDefaults,
        );
        UserEdit.verifyRadioButtonCustomFieldDefaultValue(
          testData.customFields.radioButton.name,
          radioButtonDefault,
        );
        UserEdit.verifySingleSelectCustomFieldDefaultValue(
          testData.customFields.singleSelect.name,
          singleSelectDefault,
        );
      },
    );
  });
});
