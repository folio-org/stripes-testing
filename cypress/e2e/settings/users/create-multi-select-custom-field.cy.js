import { getTestEntityValue } from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import Users from '../../../support/fragments/users/users';

describe('Settings (Users) - Custom Fields', () => {
  const testData = {
    user: {},
    fieldLabel: getTestEntityValue('MultiSelectField'),
    option1: getTestEntityValue('Option1'),
    option2: getTestEntityValue('Option2'),
    option3: getTestEntityValue('Option3'),
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.uiUsersCustomField.gui, Permissions.uiUserEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;
      },
    );
  });

  beforeEach(() => {
    cy.waitForAuthRefresh(() => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.customFieldsPath,
        waiter: CustomFields.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C15698 Create a multi-select custom field (volaris)',
    { tags: ['extendedPath', 'volaris', 'C15698'] },
    () => {
      CustomFields.waitLoading();

      CustomFields.editButton();
      CustomFields.verifyEditCustomFieldsPaneIsOpen();
      CustomFields.verifyAddCustomFieldButtonIsActive();

      const multiSelectData = {
        fieldLabel: testData.fieldLabel,
        label1: testData.option1,
        label2: testData.option2,
      };

      CustomFields.fillMultiSelectCustomFieldOnly(multiSelectData);
      CustomFields.clickAddOptionButton();
      CustomFields.fillOptionInRow(2, testData.option3);
      CustomFields.clickSaveAndClose();
      CustomFields.verifyCustomFieldExists(testData.fieldLabel);
    },
  );
});
