import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  generateCheckboxCustomFieldData,
  generateDatePickerCustomFieldData,
  generateMultiSelectCustomFieldData,
  generateRadioButtonCustomFieldData,
  generateSingleSelectCustomFieldData,
  generateTextAreaCustomFieldData,
  generateTextFieldCustomFieldData,
} from '../../../support/utils/customFields';

const CASE_ID = '812849';
const TEST_PREFIX = `AT_C${CASE_ID}`;

const getNamedValue = (description) => `${TEST_PREFIX}_${description}_${getRandomPostfix()}`;
const getFutureDate = (offsetDays) => {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
};
const createOptionValues = (description) => [
  {
    id: 'opt_0',
    value: getNamedValue(`${description}Option1`),
    default: false,
  },
  {
    id: 'opt_1',
    value: getNamedValue(`${description}Option2`),
    default: false,
  },
];

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    const testData = {
      user: {},
      createdCustomFields: [],
      customFieldsAccordionName: 'Custom fields',
      userRecord: {
        barcode: getNamedValue('Barcode'),
        email: 'a',
        lastName: getNamedValue('LastName'),
        username: `at_c${CASE_ID}_user_${getRandomPostfix()}`.toLowerCase(),
      },
      customFields: {
        checkbox: generateCheckboxCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('CheckboxHelp'),
            name: getNamedValue('Checkbox'),
          },
        }),
        datePicker: generateDatePickerCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('DatePickerHelp'),
            name: getNamedValue('DatePicker'),
          },
        }),
        multiSelect: generateMultiSelectCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('MultiSelectHelp'),
            name: getNamedValue('MultiSelect'),
            selectField: {
              multiSelect: true,
              options: {
                values: createOptionValues('MultiSelect'),
              },
            },
          },
        }),
        radioButton: generateRadioButtonCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('RadioButtonHelp'),
            name: getNamedValue('RadioButtonSet'),
            selectField: {
              multiSelect: false,
              options: {
                values: createOptionValues('RadioButton'),
              },
            },
          },
        }),
        singleSelect: generateSingleSelectCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('SingleSelectHelp'),
            name: getNamedValue('SingleSelect'),
            selectField: {
              multiSelect: false,
              options: {
                values: createOptionValues('SingleSelect'),
              },
            },
          },
        }),
        textArea: generateTextAreaCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('TextAreaHelp'),
            name: getNamedValue('TextArea'),
          },
        }),
        textField: generateTextFieldCustomFieldData({
          testNumber: CASE_ID,
          data: {
            displayInAccordion: 'fees_fines',
            helpText: getNamedValue('TextFieldHelp'),
            name: getNamedValue('TextField'),
          },
        }),
      },
    };

    const getAllCustomFields = () => Object.values(testData.customFields);
    const getAllCustomFieldLabels = () => getAllCustomFields().map(({ name }) => name);
    const getCustomFieldValues = (valueSet) => {
      return [
        {
          customField: testData.customFields.checkbox,
          value: valueSet.checkbox,
        },
        {
          customField: testData.customFields.datePicker,
          value: valueSet.datePicker,
        },
        {
          customField: testData.customFields.multiSelect,
          value: valueSet.multiSelect,
        },
        {
          customField: testData.customFields.radioButton,
          value: valueSet.radioButton,
        },
        {
          customField: testData.customFields.singleSelect,
          value: valueSet.singleSelect,
        },
        {
          customField: testData.customFields.textArea,
          value: valueSet.textArea,
        },
        {
          customField: testData.customFields.textField,
          value: valueSet.textField,
        },
      ];
    };
    const getAccordionFieldValues = (customFieldValues, customFields) => {
      const customFieldNames = customFields.map(({ name }) => name);

      return customFieldValues.filter(({ customField }) => customFieldNames.includes(customField.name));
    };
    const getDistributedCustomFields = () => ({
      [testData.customFieldsAccordionName]: [
        testData.customFields.multiSelect,
        testData.customFields.textArea,
      ],
      'Fees/fines': [testData.customFields.datePicker, testData.customFields.radioButton],
      Loans: [testData.customFields.checkbox],
      Requests: [testData.customFields.singleSelect, testData.customFields.textField],
    });
    const customFieldOptionValues = {
      multiSelect: testData.customFields.multiSelect.selectField.options.values.map(
        ({ value }) => value,
      ),
      radioButton: testData.customFields.radioButton.selectField.options.values.map(
        ({ value }) => value,
      ),
      singleSelect: testData.customFields.singleSelect.selectField.options.values.map(
        ({ value }) => value,
      ),
    };
    const initialCustomFieldValues = getCustomFieldValues({
      checkbox: true,
      datePicker: getFutureDate(10),
      multiSelect: [customFieldOptionValues.multiSelect[0]],
      radioButton: customFieldOptionValues.radioButton[0],
      singleSelect: customFieldOptionValues.singleSelect[0],
      textArea: 'a',
      textField: 'e',
    });
    const firstUpdatedCustomFieldValues = getCustomFieldValues({
      checkbox: false,
      datePicker: getFutureDate(20),
      multiSelect: [customFieldOptionValues.multiSelect[1]],
      radioButton: customFieldOptionValues.radioButton[1],
      singleSelect: customFieldOptionValues.singleSelect[1],
      textArea: 'b',
      textField: 'f',
    });
    const secondUpdatedCustomFieldValues = getCustomFieldValues({
      checkbox: true,
      datePicker: getFutureDate(30),
      multiSelect: customFieldOptionValues.multiSelect,
      radioButton: customFieldOptionValues.radioButton[0],
      singleSelect: customFieldOptionValues.singleSelect[0],
      textArea: 'c',
      textField: 'g',
    });
    const thirdUpdatedCustomFieldValues = getCustomFieldValues({
      checkbox: false,
      datePicker: getFutureDate(40),
      multiSelect: [customFieldOptionValues.multiSelect[1]],
      radioButton: customFieldOptionValues.radioButton[1],
      singleSelect: customFieldOptionValues.singleSelect[1],
      textArea: 'd',
      textField: 'h',
    });

    const openCreatedUserCard = () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersCard.waitLoading();
    };
    const openCreatedUserEdit = () => {
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();
    };
    const distributeCustomFieldsAcrossAccordions = () => {
      CustomFields.visitCustomFieldsSettings();

      CustomFields.openEdit();
      CustomFields.setDisplayInAccordion(testData.customFields.checkbox.name, 'Loans');
      CustomFields.setDisplayInAccordion(testData.customFields.datePicker.name, 'Fees/fines');
      CustomFields.setDisplayInAccordion(
        testData.customFields.multiSelect.name,
        testData.customFieldsAccordionName,
      );
      CustomFields.setDisplayInAccordion(testData.customFields.radioButton.name, 'Fees/fines');
      CustomFields.setDisplayInAccordion(testData.customFields.singleSelect.name, 'Requests');
      CustomFields.setDisplayInAccordion(
        testData.customFields.textArea.name,
        testData.customFieldsAccordionName,
      );
      CustomFields.setDisplayInAccordion(testData.customFields.textField.name, 'Requests');
      CustomFields.verifyDisplayInAccordion(testData.customFields.checkbox.name, 'Loans');
      CustomFields.verifyDisplayInAccordion(testData.customFields.datePicker.name, 'Fees/fines');
      CustomFields.verifyDisplayInAccordion(
        testData.customFields.multiSelect.name,
        testData.customFieldsAccordionName,
      );
      CustomFields.verifyDisplayInAccordion(testData.customFields.radioButton.name, 'Fees/fines');
      CustomFields.verifyDisplayInAccordion(testData.customFields.singleSelect.name, 'Requests');
      CustomFields.verifyDisplayInAccordion(
        testData.customFields.textArea.name,
        testData.customFieldsAccordionName,
      );
      CustomFields.verifyDisplayInAccordion(testData.customFields.textField.name, 'Requests');
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          return ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint.id;
          });
        })
        .then(() => {
          return cy.getPatronGroupsApi({ limit: 1 }).then((usergroups) => {
            const firstPatronGroup = usergroups[0];

            testData.patronGroup = firstPatronGroup.desc
              ? `${firstPatronGroup.group} (${firstPatronGroup.desc})`
              : firstPatronGroup.group;
          });
        })
        .then(() => {
          return CustomFields.getCustomFieldsAccordionLabelViaApi().then((accordionName) => {
            testData.customFieldsAccordionName = accordionName;
          });
        })
        .then(() => {
          return cy.createCustomFieldsViaApi(getAllCustomFields()).then((createdCustomFields) => {
            testData.createdCustomFields = createdCustomFields;
          });
        })
        .then(() => {
          return cy
            .createTempUser([
              Permissions.uiUsersCustomField.gui,
              Permissions.uiUsersCreate.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.usersViewRequests.gui,
            ])
            .then((userProperties) => {
              testData.user = userProperties;

              return UserEdit.addServicePointViaApi(
                testData.servicePointId,
                testData.user.userId,
                testData.servicePointId,
              );
            });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      if (testData.createdUserId) {
        Users.deleteViaApi(testData.createdUserId);
      }

      if (testData.createdCustomFields.length) {
        cy.deleteCustomFieldsViaApi({ ids: testData.createdCustomFields.map(({ id }) => id) });
      }

      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C812849 - View and edit Custom fields in Fees/fines, Loans, Requests accordions with appropriate permissions',
      { tags: ['extendedPath', 'volaris', 'C812849'] },
      () => {
        const distributedCustomFields = getDistributedCustomFields();

        // Step 1: Open the create user page and review the visible accordions
        Users.clickNewButton();
        Users.checkCreateUserPaneOpened();
        UserEdit.fillRequiredFields(
          testData.userRecord.lastName,
          testData.patronGroup,
          testData.userRecord.email,
          'Patron',
          testData.userRecord.username,
        );
        UserEdit.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
        ]);
        UserEdit.verifyAccordionsAbsent([testData.customFieldsAccordionName, 'Loans', 'Requests']);
        UserEdit.verifyCustomFieldsPresentInAccordion('Fees/fines', getAllCustomFields());
        UserEdit.scrollToTheLastCustomField();

        // Step 2: Populate the custom fields in the Fees/fines accordion
        UserEdit.fillCustomFieldsInAccordion('Fees/fines', initialCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion('Fees/fines', initialCustomFieldValues);

        // Step 3: Save the user and review the details pane
        UserEdit.saveNewUser().then((userId) => {
          testData.createdUserId = userId;
        });
        UsersCard.waitLoading();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyAccordionsAbsent([testData.customFieldsAccordionName]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion('Fees/fines', initialCustomFieldValues, {
          isAccordionOpen: true,
        });

        // Step 4: Move every custom field to the Loans accordion in settings
        CustomFields.moveAllCustomFieldsToAccordion(getAllCustomFieldLabels(), 'Loans');

        // Step 5: Save the custom field settings after moving them to Loans
        CustomFields.saveAndClose();

        // Step 6: Reopen the user details pane and review the Loans accordion
        openCreatedUserCard();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyAccordionsAbsent([testData.customFieldsAccordionName]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion('Loans', initialCustomFieldValues, {
          isAccordionOpen: true,
        });

        // Step 7: Open the user edit pane and review the Loans accordion
        openCreatedUserEdit();
        UserEdit.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Loans',
        ]);
        UserEdit.verifyAccordionsAbsent([
          testData.customFieldsAccordionName,
          'Fees/fines',
          'Requests',
        ]);
        UserEdit.verifyCustomFieldsPresentInAccordion('Loans', getAllCustomFields());

        // Step 8: Edit the Loans custom fields and save the user record
        UserEdit.fillCustomFieldsInAccordion('Loans', firstUpdatedCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion('Loans', firstUpdatedCustomFieldValues);
        UserEdit.saveEditedUser();
        UsersCard.waitLoading();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyAccordionsAbsent([testData.customFieldsAccordionName]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion('Loans', firstUpdatedCustomFieldValues, {
          isAccordionOpen: true,
        });

        // Step 9: Move every custom field to the Requests accordion in settings
        CustomFields.moveAllCustomFieldsToAccordion(getAllCustomFieldLabels(), 'Requests');

        // Step 10: Save the custom field settings after moving them to Requests
        CustomFields.saveAndClose();
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 11: Reopen the user details pane and review the Requests accordion
        openCreatedUserCard();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyAccordionsAbsent([testData.customFieldsAccordionName]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion('Requests', firstUpdatedCustomFieldValues, {
          isAccordionOpen: true,
        });

        // Step 12: Open the user edit pane and review the Requests accordion
        openCreatedUserEdit();
        UserEdit.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Requests',
        ]);
        UserEdit.verifyAccordionsAbsent([
          testData.customFieldsAccordionName,
          'Fees/fines',
          'Loans',
        ]);
        UserEdit.verifyCustomFieldsPresentInAccordion('Requests', getAllCustomFields());

        // Step 13: Edit the Requests custom fields and save the user record
        UserEdit.fillCustomFieldsInAccordion('Requests', secondUpdatedCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion('Requests', secondUpdatedCustomFieldValues);
        UserEdit.saveEditedUser();
        UsersCard.waitLoading();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyAccordionsAbsent([testData.customFieldsAccordionName]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion('Requests', secondUpdatedCustomFieldValues, {
          isAccordionOpen: true,
        });

        // Step 14: Distribute the custom fields across the configured accordions in settings
        distributeCustomFieldsAcrossAccordions();

        // Step 15: Save the custom field settings after distributing the field types
        CustomFields.saveAndClose();
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 16: Reopen the user details pane and review the distributed custom fields
        openCreatedUserCard();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          testData.customFieldsAccordionName,
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          getAccordionFieldValues(
            secondUpdatedCustomFieldValues,
            distributedCustomFields[testData.customFieldsAccordionName],
          ),
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Fees/fines',
          getAccordionFieldValues(
            secondUpdatedCustomFieldValues,
            distributedCustomFields['Fees/fines'],
          ),
          { isAccordionOpen: true },
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Loans',
          getAccordionFieldValues(secondUpdatedCustomFieldValues, distributedCustomFields.Loans),
          { isAccordionOpen: true },
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Requests',
          getAccordionFieldValues(secondUpdatedCustomFieldValues, distributedCustomFields.Requests),
          { isAccordionOpen: true },
        );

        // Step 17: Open the user edit pane and review the distributed custom fields
        openCreatedUserEdit();
        UserEdit.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          testData.customFieldsAccordionName,
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UserEdit.verifyCustomFieldsPresentInAccordion(
          testData.customFieldsAccordionName,
          distributedCustomFields[testData.customFieldsAccordionName],
        );
        UserEdit.verifyCustomFieldsPresentInAccordion(
          'Fees/fines',
          distributedCustomFields['Fees/fines'],
        );
        UserEdit.verifyCustomFieldsPresentInAccordion('Loans', distributedCustomFields.Loans);
        UserEdit.verifyCustomFieldsPresentInAccordion('Requests', distributedCustomFields.Requests);

        // Step 18: Edit the distributed custom fields and save the updated user record
        UserEdit.fillCustomFieldsInAccordion(
          testData.customFieldsAccordionName,
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields[testData.customFieldsAccordionName],
          ),
        );
        UserEdit.fillCustomFieldsInAccordion(
          'Fees/fines',
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields['Fees/fines'],
          ),
        );
        UserEdit.fillCustomFieldsInAccordion(
          'Loans',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Loans),
        );
        UserEdit.fillCustomFieldsInAccordion(
          'Requests',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Requests),
        );
        UserEdit.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields[testData.customFieldsAccordionName],
          ),
        );
        UserEdit.verifyCustomFieldValuesInAccordion(
          'Fees/fines',
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields['Fees/fines'],
          ),
        );
        UserEdit.verifyCustomFieldValuesInAccordion(
          'Loans',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Loans),
        );
        UserEdit.verifyCustomFieldValuesInAccordion(
          'Requests',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Requests),
        );
        UserEdit.saveEditedUser();
        UsersCard.waitLoading();
        UsersCard.verifyAccordionsPresent([
          'User information',
          'Extended information',
          'Contact information',
          testData.customFieldsAccordionName,
          'Fees/fines',
          'Loans',
          'Requests',
        ]);
        UsersCard.verifyFeesFinesLinksExist();
        UsersCard.verifyLoansLinksExist();
        UsersCard.verifyRequestsInfoExists();
        UsersCard.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields[testData.customFieldsAccordionName],
          ),
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Fees/fines',
          getAccordionFieldValues(
            thirdUpdatedCustomFieldValues,
            distributedCustomFields['Fees/fines'],
          ),
          { isAccordionOpen: true },
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Loans',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Loans),
          { isAccordionOpen: true },
        );
        UsersCard.verifyCustomFieldValuesInAccordion(
          'Requests',
          getAccordionFieldValues(thirdUpdatedCustomFieldValues, distributedCustomFields.Requests),
          { isAccordionOpen: true },
        );
      },
    );
  });
});
