import Permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { generateMultiSelectCustomFieldData } from '../../../support/utils/customFields';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    const CASE_ID = 'C1504465';
    const CUSTOM_FIELDS_ACCORDION = 'Custom fields';

    const requiredMultiSelect = generateMultiSelectCustomFieldData({
      testNumber: CASE_ID,
      data: { required: true },
    });
    const nonRequiredMultiSelect = generateMultiSelectCustomFieldData({
      testNumber: CASE_ID,
    });

    const option1 = requiredMultiSelect.selectField.options.values[0].value;

    const newUserRecord = {
      lastName: `AT_${CASE_ID}_LN_${getRandomPostfix()}`,
      email: `at_c${CASE_ID}_${getRandomPostfix()}@folio.org`,
      username: `at_c${CASE_ID}_${getRandomPostfix()}`.toLowerCase(),
    };

    const testData = {
      patron: {},
      staffUser: {},
      patronGroup: '',
      servicePointId: '',
      createdCustomFields: [],
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          return ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint.id;
          });
        })
        .then(() => {
          return cy.getPatronGroupsApi({ limit: 1 }).then((groups) => {
            const group = groups[0];
            testData.patronGroup = group.desc ? `${group.group} (${group.desc})` : group.group;
          });
        })
        .then(() => {
          return cy
            .createCustomFieldsViaApi([requiredMultiSelect, nonRequiredMultiSelect])
            .then((createdFields) => {
              testData.createdCustomFields = createdFields;
            });
        })
        .then(() => {
          return cy.createTempUser([]).then((patronProperties) => {
            testData.patron = patronProperties;
          });
        })
        .then(() => {
          return cy
            .createTempUser([Permissions.uiUsersEdit.gui, Permissions.uiUsersCreate.gui])
            .then((staffProperties) => {
              testData.staffUser = staffProperties;
              return UserEdit.addServicePointViaApi(
                testData.servicePointId,
                staffProperties.userId,
                testData.servicePointId,
              );
            });
        })
        .then(() => {
          cy.login(testData.staffUser.username, testData.staffUser.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.patron.userId);
      Users.deleteViaApi(testData.staffUser.userId);
      cy.deleteCustomFieldsViaApi({ ids: testData.createdCustomFields.map(({ id }) => id) });
    });

    it(
      `${CASE_ID} Warning appears only under empty required multiselect custom field on user create/edit page (vega)`,
      { tags: ['extendedPath', 'vega', CASE_ID, 'nonParallel'] },
      () => {
        // Step 1: Navigate to patron, open edit, make change outside Custom fields, click Save & close
        UsersSearchPane.searchByUsername(testData.patron.username);
        UsersSearchPane.selectUserFromList(testData.patron.username);
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.fillEmailAddress(`modified_${Date.now()}@folio.org`);
        UserEdit.saveAndCloseStayOnEdit();
        UserEdit.checkUserEditPaneOpened();

        // Step 2: Select then remove values from both multiselect fields
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.clearCustomFieldMultiSelect(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
          option1,
        );
        UserEdit.clearCustomFieldMultiSelect(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
          option1,
        );
        UserEdit.verifyMultiSelectCustomFieldError(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          `${requiredMultiSelect.name} is required`,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
        );

        // Step 3: Select a value in the required field — warning disappears
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
        );

        // Step 4: Cancel — edit page closes, changes are not saved
        UserEdit.cancelChanges();
        UserEdit.checkUserEditPaneOpened(false);

        // Step 5: Open Create User page via Actions → New
        Users.clickNewButton();
        Users.checkCreateUserPaneOpened();

        // Step 6: Fill mandatory fields outside Custom fields, click Save & close
        UserEdit.fillRequiredFields(
          newUserRecord.lastName,
          testData.patronGroup,
          newUserRecord.email,
          'Patron',
          newUserRecord.username,
        );
        UserEdit.setExpirationDate();
        UserEdit.saveAndCloseStayOnEdit();
        Users.checkCreateUserPaneOpened();

        // Step 7: Select then remove values from both multiselect fields
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.clearCustomFieldMultiSelect(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
          option1,
        );
        UserEdit.clearCustomFieldMultiSelect(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
          option1,
        );
        UserEdit.verifyMultiSelectCustomFieldError(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          `${requiredMultiSelect.name} is required`,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
        );

        // Step 8: Select a value in the required field — warning disappears
        UserEdit.chooseCustomFieldMultiSelectOption(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
          option1,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          requiredMultiSelect.name,
        );
        UserEdit.verifyMultiSelectCustomFieldNoError(
          CUSTOM_FIELDS_ACCORDION,
          nonRequiredMultiSelect.name,
        );

        // Step 9: Cancel — create page closes, user is not created
        UserEdit.cancelChanges();
        Users.checkCreateUserPaneOpened(false);
      },
    );
  });
});
