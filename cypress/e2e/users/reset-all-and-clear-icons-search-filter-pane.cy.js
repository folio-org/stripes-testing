import CapabilitySets from '../../support/dictionary/capabilitySets';
import Departments from '../../support/fragments/settings/users/departments';
import CustomFields from '../../support/fragments/settings/users/customFields';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane, {
  usersFilterAccordionIds,
} from '../../support/fragments/users/usersSearchPane';
import {
  generateCheckboxCustomFieldData,
  generateMultiSelectCustomFieldData,
  generateRadioButtonCustomFieldData,
  generateSingleSelectCustomFieldData,
} from '../../support/utils/customFields';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {};
  const testNumber = 'C1528162';

  // Generate names synchronously so they can be referenced both in before() and in the it() block.
  const checkboxFieldData = generateCheckboxCustomFieldData({ testNumber });
  const multiSelectFieldData = generateMultiSelectCustomFieldData({ testNumber });
  const radioButtonFieldData = generateRadioButtonCustomFieldData({ testNumber });
  const singleSelectFieldData = generateSingleSelectCustomFieldData({ testNumber });
  const departmentName = `AT_${testNumber}_Dept_${getRandomPostfix()}`;
  const tagLabel = `at-${testNumber.toLowerCase()}-tag-${getRandomPostfix()}`;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      CustomFields.createCustomFieldsViaApi([
        checkboxFieldData,
        multiSelectFieldData,
        radioButtonFieldData,
        singleSelectFieldData,
      ]).then((createdFields) => {
        [
          testData.checkboxField,
          testData.multiSelectField,
          testData.radioButtonField,
          testData.singleSelectField,
        ] = createdFields;
        testData.customFieldIds = createdFields.map(({ id }) => id);
      });

      Departments.createViaApi({ name: departmentName, code: `at-${getRandomPostfix()}` }).then(
        (id) => {
          testData.departmentId = id;
        },
      );

      cy.createTagApi({ label: tagLabel, description: `AT_${testNumber}` }).then((id) => {
        testData.tagId = id;
      });

      cy.getPatronGroupsApi({ limit: 1 }).then((groups) => {
        testData.patronGroupName = groups[0].group;
      });

      cy.createTempUser([]).then((userProps) => {
        testData.user = userProps;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiUsersView, CapabilitySets.uiTagsView],
        );
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.customFieldIds) {
      cy.deleteCustomFieldsViaApi({ ids: testData.customFieldIds });
    }
    if (testData.departmentId) Departments.deleteViaApi(testData.departmentId);
    if (testData.tagId) cy.deleteTagApi(testData.tagId);
    if (testData.user) Users.deleteViaApi(testData.user.userId);
  });

  it(
    "C1528162 'Reset all' button and 'X' icon displaying on 'Search & filter' pane in 'Users' app (vega)",
    { tags: ['criticalPath', 'vega', 'C1528162'] },
    () => {
      const cfId = (field) => `users-filter-accordion-custom-field-${field.refId}`;
      const allFixedIds = Object.values(usersFilterAccordionIds);
      const allCustomFieldIds = () =>
        [
          testData.checkboxField,
          testData.multiSelectField,
          testData.radioButtonField,
          testData.singleSelectField,
        ].map(cfId);

      // Step 1: Observe the Search & filter pane — no X icons, Reset all / Search disabled
      UsersSearchPane.verifySearchButtonEnabled(false);
      UsersSearchPane.verifyResetAllButtonEnabled(false);
      [...allFixedIds, ...allCustomFieldIds()].forEach((id) => {
        UsersSearchPane.verifyFilterAccordionClearButtonExists(id, false);
      });

      // Step 2: Select a value in every filter accordion — X icons appear, Reset all becomes active
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.selectPatronGroupFilter(testData.patronGroupName);
      UsersSearchPane.selectDepartmentsFilter(departmentName);
      UsersSearchPane.chooseTagOption(tagLabel);
      UsersSearchPane.selectCustomFieldCheckboxFilter(
        cfId(testData.checkboxField),
        testData.checkboxField.name,
      );
      UsersSearchPane.selectCustomFieldMultiSelectFilter(
        cfId(testData.multiSelectField),
        'MultiSelectOption1',
      );
      UsersSearchPane.selectCustomFieldCheckboxFilter(
        cfId(testData.radioButtonField),
        'RadioButtonOption1',
      );
      UsersSearchPane.selectCustomFieldMultiSelectFilter(
        cfId(testData.singleSelectField),
        'SingleSelectOption1',
      );

      UsersSearchPane.verifyResetAllButtonEnabled(true);
      [...allFixedIds, ...allCustomFieldIds()].forEach((id) => {
        UsersSearchPane.verifyFilterAccordionClearButtonExists(id, true);
      });

      // Step 3: Click X on Departments — Departments clears, all other X icons remain
      UsersSearchPane.clickFilterAccordionClearButton(usersFilterAccordionIds.departments);
      UsersSearchPane.verifyResetAllButtonEnabled(true);
      UsersSearchPane.verifyFilterAccordionClearButtonExists(
        usersFilterAccordionIds.departments,
        false,
      );
      [
        usersFilterAccordionIds.status,
        usersFilterAccordionIds.patronGroup,
        usersFilterAccordionIds.tags,
        ...allCustomFieldIds(),
      ].forEach((id) => {
        UsersSearchPane.verifyFilterAccordionClearButtonExists(id, true);
      });

      // Step 4: Remove Tags selection — Tags X icon disappears, others remain
      UsersSearchPane.unselectTagOption();
      UsersSearchPane.verifyResetAllButtonEnabled(true);
      UsersSearchPane.verifyFilterAccordionClearButtonExists(usersFilterAccordionIds.tags, false);
      [
        usersFilterAccordionIds.status,
        usersFilterAccordionIds.patronGroup,
        ...allCustomFieldIds(),
      ].forEach((id) => {
        UsersSearchPane.verifyFilterAccordionClearButtonExists(id, true);
      });

      // Step 5: Click Reset all — all X icons gone, Reset all becomes inactive
      UsersSearchPane.clickResetAllFilters();
      UsersSearchPane.verifyResetAllButtonEnabled(false);
      [...allFixedIds, ...allCustomFieldIds()].forEach((id) => {
        UsersSearchPane.verifyFilterAccordionClearButtonExists(id, false);
      });
    },
  );
});
