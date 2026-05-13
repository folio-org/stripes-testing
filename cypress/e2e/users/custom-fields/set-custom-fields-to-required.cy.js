import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

const getFieldLabel = (description) => `AT_C15699_${description}_${getRandomPostfix()}`;
const getHelpText = (description) => `AT_C15699_${description}_Help_${getRandomPostfix()}`;

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    const testData = {
      customFields: {
        checkbox: {
          fieldLabel: getFieldLabel('Checkbox'),
          helpText: getHelpText('Checkbox'),
        },
        datePicker: {
          fieldLabel: getFieldLabel('DatePicker'),
          helpText: getHelpText('DatePicker'),
        },
        multiSelect: {
          fieldLabel: getFieldLabel('MultiSelect'),
          label1: getFieldLabel('MultiSelectOption1'),
          label2: getFieldLabel('MultiSelectOption2'),
        },
        radioButton: {
          data: {
            fieldLabel: getFieldLabel('RadioButtonSet'),
            helpText: getHelpText('RadioButtonSet'),
            label1: getFieldLabel('RadioButtonOption1'),
            label2: getFieldLabel('RadioButtonOption2'),
          },
        },
        singleSelect: {
          data: {
            fieldLabel: getFieldLabel('SingleSelect'),
            helpText: getHelpText('SingleSelect'),
            firstLabel: getFieldLabel('SingleSelectOption1'),
            secondLabel: getFieldLabel('SingleSelectOption2'),
          },
        },
        textArea: {
          fieldLabel: getFieldLabel('TextArea'),
          helpText: getHelpText('TextArea'),
        },
        textField: {
          fieldLabel: getFieldLabel('TextField'),
          helpText: getHelpText('TextField'),
        },
      },
    };

    const allCustomFieldLabels = [
      testData.customFields.checkbox.fieldLabel,
      testData.customFields.datePicker.fieldLabel,
      testData.customFields.multiSelect.fieldLabel,
      testData.customFields.radioButton.data.fieldLabel,
      testData.customFields.singleSelect.data.fieldLabel,
      testData.customFields.textArea.fieldLabel,
      testData.customFields.textField.fieldLabel,
    ];

    const cleanupFieldLabels = [...allCustomFieldLabels].reverse();

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
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.customFieldsPath,
            waiter: CustomFields.waitLoading,
          });

          CustomFields.addCustomCheckBox(testData.customFields.checkbox);
          CustomFields.addCustomDatePicker(testData.customFields.datePicker);
          CustomFields.addMultiSelectCustomField(testData.customFields.multiSelect);
          CustomFields.addCustomRadioButton(testData.customFields.radioButton);
          CustomFields.addCustomSingleSelect(testData.customFields.singleSelect);
          CustomFields.addCustomTextArea(testData.customFields.textArea);
          CustomFields.addCustomTextField(testData.customFields.textField);
        });
    });

    after('Delete test data', () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.waitLoading();
      CustomFields.deleteCustomField(cleanupFieldLabels);

      cy.getAdminToken();
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
        CustomFields.expandCustomFieldInEditPane(testData.customFields.checkbox.fieldLabel);
        CustomFields.verifyRequiredOptionVisible(testData.customFields.checkbox.fieldLabel, false);

        // Step 4: Expand the Date picker custom field and verify the Required option is present
        CustomFields.expandCustomFieldInEditPane(testData.customFields.datePicker.fieldLabel);
        CustomFields.verifyRequiredOptionVisible(testData.customFields.datePicker.fieldLabel);

        // Step 5: Set the Date picker custom field as required
        CustomFields.setRequiredOption(testData.customFields.datePicker.fieldLabel);
        CustomFields.verifySaveAndCloseButtonEnabled();

        // Step 6: Expand the Multi-select custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.multiSelect.fieldLabel);
        CustomFields.setRequiredOption(testData.customFields.multiSelect.fieldLabel);

        // Step 7: Expand the Radio button set custom field and verify the Required option is absent
        CustomFields.expandCustomFieldInEditPane(testData.customFields.radioButton.data.fieldLabel);
        CustomFields.verifyRequiredOptionVisible(
          testData.customFields.radioButton.data.fieldLabel,
          false,
        );

        // Step 8: Expand the Single select custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(
          testData.customFields.singleSelect.data.fieldLabel,
        );
        CustomFields.setRequiredOption(testData.customFields.singleSelect.data.fieldLabel);

        // Step 9: Expand the Text area custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.textArea.fieldLabel);
        CustomFields.setRequiredOption(testData.customFields.textArea.fieldLabel);

        // Step 10: Expand the Text field custom field and set it as required
        CustomFields.expandCustomFieldInEditPane(testData.customFields.textField.fieldLabel);
        CustomFields.setRequiredOption(testData.customFields.textField.fieldLabel);

        // Step 11: Save changes and verify the Custom fields pane is displayed again
        CustomFields.saveAndClose();

        // Step 12: Verify the required value is set to Yes for every required custom field
        CustomFields.expandCustomFieldInViewPane(testData.customFields.datePicker.fieldLabel);
        CustomFields.verifyRequiredValue(testData.customFields.datePicker.fieldLabel);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.multiSelect.fieldLabel);
        CustomFields.verifyRequiredValue(testData.customFields.multiSelect.fieldLabel);
        CustomFields.expandCustomFieldInViewPane(
          testData.customFields.singleSelect.data.fieldLabel,
        );
        CustomFields.verifyRequiredValue(testData.customFields.singleSelect.data.fieldLabel);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.textArea.fieldLabel);
        CustomFields.verifyRequiredValue(testData.customFields.textArea.fieldLabel);
        CustomFields.expandCustomFieldInViewPane(testData.customFields.textField.fieldLabel);
        CustomFields.verifyRequiredValue(testData.customFields.textField.fieldLabel);

        // Step 13: Open the create user page and verify all custom fields and required markers
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.waitLoading();
        Users.clickNewButton();
        Users.checkCreateUserPaneOpened();
        UserEdit.openCustomFieldsAccordion();

        UserEdit.verifyCheckboxCustomFieldExists(testData.customFields.checkbox.fieldLabel);
        UserEdit.verifyRadioButtonCustomFieldExists(
          testData.customFields.radioButton.data.fieldLabel,
        );

        UserEdit.verifyDatePickerCustomFieldRequired(testData.customFields.datePicker.fieldLabel);
        UserEdit.verifyMultiSelectCustomFieldRequired(testData.customFields.multiSelect.fieldLabel);
        UserEdit.verifySingleSelectCustomFieldRequired(
          testData.customFields.singleSelect.data.fieldLabel,
        );
        UserEdit.verifyTextAreaCustomFieldRequired(testData.customFields.textArea.fieldLabel);
        UserEdit.verifyTextFieldCustomFieldRequired(testData.customFields.textField.fieldLabel);
      },
    );
  });
});
