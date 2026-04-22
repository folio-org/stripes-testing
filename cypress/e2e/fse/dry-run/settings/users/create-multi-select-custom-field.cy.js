import CustomFields from '../../../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Settings (Users) - Custom Fields', () => {
  const { user, memberTenant } = parseSanityParameters();
  const testData = {
    user: {},
    fieldLabel: getTestEntityValue('MultiSelectField'),
    option1: getTestEntityValue('Option1'),
    option2: getTestEntityValue('Option2'),
    option3: getTestEntityValue('Option3'),
  };

  before('Create test data', () => {
    cy.setTenant(memberTenant.id);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.customFieldsPath,
      waiter: () => cy.wait(10000),
      authRefresh: true,
    });
  });

  it(
    'C15698 Create a multi-select custom field (volaris)',
    { tags: ['dryRun', 'volaris', 'C15698'] },
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
