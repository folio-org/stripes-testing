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

const CASE_ID = '812852';
const TEST_PREFIX = `AT_C${CASE_ID}`;
const DOMAIN_ACCORDIONS = ['Fees/fines', 'Loans', 'Requests'];

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
        defaultTextField: generateTextFieldCustomFieldData({
          testNumber: CASE_ID,
          data: {
            helpText: getNamedValue('DefaultTextFieldHelp'),
            name: getNamedValue('DefaultTextField'),
          },
        }),
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

    const domainCustomFieldKeys = [
      'checkbox',
      'datePicker',
      'multiSelect',
      'radioButton',
      'singleSelect',
      'textArea',
      'textField',
    ];
    const getDomainCustomFields = () => domainCustomFieldKeys.map((key) => testData.customFields[key]);
    const getAllCustomFields = () => [
      testData.customFields.defaultTextField,
      ...getDomainCustomFields(),
    ];
    const getDomainCustomFieldLabels = () => getDomainCustomFields().map(({ name }) => name);
    const getDefaultCustomFieldValues = (value) => [
      {
        customField: testData.customFields.defaultTextField,
        value,
      },
    ];
    const getCustomFieldValues = (valueSet) => [
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
    const getAccordionFieldValues = (customFieldValues, customFields) => {
      const customFieldNames = customFields.map(({ name }) => name);

      return customFieldValues.filter(({ customField }) => customFieldNames.includes(customField.name));
    };
    const getDistributedCustomFields = () => ({
      [testData.customFieldsAccordionName]: [testData.customFields.defaultTextField],
      'Fees/fines': [
        testData.customFields.checkbox,
        testData.customFields.singleSelect,
        testData.customFields.textField,
      ],
      Loans: [
        testData.customFields.datePicker,
        testData.customFields.radioButton,
        testData.customFields.textArea,
      ],
      Requests: [testData.customFields.multiSelect],
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
    const firstDefaultCustomFieldValues = getDefaultCustomFieldValues('default-a');
    const secondDefaultCustomFieldValues = getDefaultCustomFieldValues('default-b');
    const thirdDefaultCustomFieldValues = getDefaultCustomFieldValues('default-c');

    const openCreatedUserCard = () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersCard.waitLoading();
    };
    const openCreatedUserEdit = () => {
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();
    };
    const distributeDomainCustomFieldsAcrossAccordions = () => {
      CustomFields.visitCustomFieldsSettings();

      CustomFields.openEdit();
      CustomFields.setDisplayInAccordion(testData.customFields.checkbox.name, 'Fees/fines');
      CustomFields.setDisplayInAccordion(testData.customFields.datePicker.name, 'Loans');
      CustomFields.setDisplayInAccordion(testData.customFields.multiSelect.name, 'Requests');
      CustomFields.setDisplayInAccordion(testData.customFields.radioButton.name, 'Loans');
      CustomFields.setDisplayInAccordion(testData.customFields.singleSelect.name, 'Fees/fines');
      CustomFields.setDisplayInAccordion(testData.customFields.textField.name, 'Fees/fines');
      CustomFields.setDisplayInAccordion(testData.customFields.textArea.name, 'Loans');
      CustomFields.verifyDisplayInAccordion(testData.customFields.checkbox.name, 'Fees/fines');
      CustomFields.verifyDisplayInAccordion(testData.customFields.datePicker.name, 'Loans');
      CustomFields.verifyDisplayInAccordion(testData.customFields.multiSelect.name, 'Requests');
      CustomFields.verifyDisplayInAccordion(testData.customFields.radioButton.name, 'Loans');
      CustomFields.verifyDisplayInAccordion(testData.customFields.singleSelect.name, 'Fees/fines');
      CustomFields.verifyDisplayInAccordion(testData.customFields.textField.name, 'Fees/fines');
      CustomFields.verifyDisplayInAccordion(testData.customFields.textArea.name, 'Loans');
    };
    const verifyHiddenDomainLinks = (accordionLabel) => {
      if (accordionLabel === 'Fees/fines') {
        UsersCard.verifyFeesFinesLinksAbsent();
      } else if (accordionLabel === 'Loans') {
        UsersCard.verifyLoansLinksAbsent();
      } else {
        UsersCard.verifyRequestsInfoAbsent();
      }
    };
    const verifyUserDetailsWithSingleDomainAccordion = (
      accordionLabel,
      customFieldValues,
      defaultFieldValues,
    ) => {
      UsersCard.verifyAccordionsPresent([
        'User information',
        'Extended information',
        'Contact information',
        testData.customFieldsAccordionName,
        accordionLabel,
      ]);
      UsersCard.verifyAccordionsAbsent(
        DOMAIN_ACCORDIONS.filter((domainAccordion) => domainAccordion !== accordionLabel),
      );
      UsersCard.verifyCustomFieldsPresentInAccordion(testData.customFieldsAccordionName, [
        testData.customFields.defaultTextField,
      ]);

      if (defaultFieldValues) {
        UsersCard.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          defaultFieldValues,
          { isAccordionOpen: true },
        );
      }

      UsersCard.verifyCustomFieldValuesInAccordion(accordionLabel, customFieldValues, {
        isAccordionOpen: false,
      });
      verifyHiddenDomainLinks(accordionLabel);
    };
    const verifyUserEditWithSingleDomainAccordion = (accordionLabel) => {
      UserEdit.verifyAccordionsPresent([
        'User information',
        'Extended information',
        'Contact information',
        testData.customFieldsAccordionName,
        accordionLabel,
      ]);
      UserEdit.verifyAccordionsAbsent(
        DOMAIN_ACCORDIONS.filter((domainAccordion) => domainAccordion !== accordionLabel),
      );
      UserEdit.verifyCustomFieldsPresentInAccordion(testData.customFieldsAccordionName, [
        testData.customFields.defaultTextField,
      ]);
      UserEdit.verifyCustomFieldsPresentInAccordion(accordionLabel, getDomainCustomFields());
    };
    const verifyDistributedUserDetails = (defaultFieldValues, customFieldValues) => {
      const distributedCustomFields = getDistributedCustomFields();

      UsersCard.verifyAccordionsPresent([
        'User information',
        'Extended information',
        'Contact information',
        testData.customFieldsAccordionName,
        'Fees/fines',
        'Loans',
        'Requests',
      ]);
      UsersCard.verifyCustomFieldValuesInAccordion(
        testData.customFieldsAccordionName,
        defaultFieldValues,
      );
      UsersCard.verifyCustomFieldValuesInAccordion(
        'Fees/fines',
        getAccordionFieldValues(customFieldValues, distributedCustomFields['Fees/fines']),
      );
      UsersCard.verifyFeesFinesLinksAbsent();
      UsersCard.verifyCustomFieldValuesInAccordion(
        'Loans',
        getAccordionFieldValues(customFieldValues, distributedCustomFields.Loans),
      );
      UsersCard.verifyLoansLinksAbsent();
      UsersCard.verifyCustomFieldValuesInAccordion(
        'Requests',
        getAccordionFieldValues(customFieldValues, distributedCustomFields.Requests),
      );
      UsersCard.verifyRequestsInfoAbsent();
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
            .createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUsersCreate.gui])
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
      'C812852 - View and edit Custom fields in Fees/fines, Loans, Requests accordions without appropriate permissions',
      { tags: ['extendedPath', 'volaris', 'C812852'] },
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
          testData.customFieldsAccordionName,
          'Fees/fines',
        ]);
        UserEdit.verifyAccordionsAbsent(['Loans', 'Requests']);
        UserEdit.verifyCustomFieldsPresentInAccordion(testData.customFieldsAccordionName, [
          testData.customFields.defaultTextField,
        ]);
        UserEdit.verifyCustomFieldsPresentInAccordion('Fees/fines', getDomainCustomFields());
        UserEdit.scrollToTheLastCustomField();

        // Step 2: Populate the custom fields in the Fees/fines accordion
        UserEdit.fillCustomFieldsInAccordion('Fees/fines', initialCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion('Fees/fines', initialCustomFieldValues);

        // Step 3: Save the user and review the details pane
        UserEdit.saveNewUser().then((userId) => {
          testData.createdUserId = userId;
        });
        UsersCard.waitLoading();
        verifyUserDetailsWithSingleDomainAccordion('Fees/fines', initialCustomFieldValues);

        // Step 4: Move every domain custom field to the Loans accordion in settings
        CustomFields.moveAllCustomFieldsToAccordion(getDomainCustomFieldLabels(), 'Loans');

        // Step 5: Save the custom field settings after moving them to Loans
        CustomFields.saveAndClose();
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 6: Reopen the user details pane and review the Loans accordion
        openCreatedUserCard();
        verifyUserDetailsWithSingleDomainAccordion('Loans', initialCustomFieldValues);

        // Step 7: Open the user edit pane and review the Loans accordion
        openCreatedUserEdit();
        verifyUserEditWithSingleDomainAccordion('Loans');

        // Step 8: Edit all custom fields and save the user record
        UserEdit.fillCustomFieldsInAccordion(
          testData.customFieldsAccordionName,
          firstDefaultCustomFieldValues,
        );
        UserEdit.fillCustomFieldsInAccordion('Loans', firstUpdatedCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          firstDefaultCustomFieldValues,
        );
        UserEdit.verifyCustomFieldValuesInAccordion('Loans', firstUpdatedCustomFieldValues);
        UserEdit.saveEditedUser();
        UsersCard.waitLoading();
        verifyUserDetailsWithSingleDomainAccordion(
          'Loans',
          firstUpdatedCustomFieldValues,
          firstDefaultCustomFieldValues,
        );

        // Step 9: Move every domain custom field to the Requests accordion in settings
        CustomFields.moveAllCustomFieldsToAccordion(getDomainCustomFieldLabels(), 'Requests');

        // Step 10: Save the custom field settings after moving them to Requests
        CustomFields.saveAndClose();
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 11: Reopen the user details pane and review the Requests accordion
        openCreatedUserCard();
        verifyUserDetailsWithSingleDomainAccordion(
          'Requests',
          firstUpdatedCustomFieldValues,
          firstDefaultCustomFieldValues,
        );

        // Step 12: Open the user edit pane and review the Requests accordion
        openCreatedUserEdit();
        verifyUserEditWithSingleDomainAccordion('Requests');

        // Step 13: Edit all custom fields and save the user record
        UserEdit.fillCustomFieldsInAccordion(
          testData.customFieldsAccordionName,
          secondDefaultCustomFieldValues,
        );
        UserEdit.fillCustomFieldsInAccordion('Requests', secondUpdatedCustomFieldValues);
        UserEdit.verifyCustomFieldValuesInAccordion(
          testData.customFieldsAccordionName,
          secondDefaultCustomFieldValues,
        );
        UserEdit.verifyCustomFieldValuesInAccordion('Requests', secondUpdatedCustomFieldValues);
        UserEdit.saveEditedUser();
        UsersCard.waitLoading();
        verifyUserDetailsWithSingleDomainAccordion(
          'Requests',
          secondUpdatedCustomFieldValues,
          secondDefaultCustomFieldValues,
        );

        // Step 14: Distribute the domain custom fields across Fees/fines, Loans, and Requests
        distributeDomainCustomFieldsAcrossAccordions();

        // Step 15: Save the custom field settings after distributing the field types
        CustomFields.saveAndClose();
        CustomFields.verifyCustomFieldsPaneIsOpen();

        // Step 16: Reopen the user details pane and review the distributed custom fields
        openCreatedUserCard();
        verifyDistributedUserDetails(
          secondDefaultCustomFieldValues,
          secondUpdatedCustomFieldValues,
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

        // Step 18: Edit all custom fields and save the updated user record
        UserEdit.fillCustomFieldsInAccordion(
          testData.customFieldsAccordionName,
          thirdDefaultCustomFieldValues,
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
          thirdDefaultCustomFieldValues,
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
        verifyDistributedUserDetails(thirdDefaultCustomFieldValues, thirdUpdatedCustomFieldValues);
      },
    );
  });
});
