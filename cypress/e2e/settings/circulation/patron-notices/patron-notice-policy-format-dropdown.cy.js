import Permissions from '../../../../support/dictionary/permissions';
import NoticePolicyTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NoticePolicies, {
  getDefaultNoticePolicy,
  NOTICE_CATEGORIES,
} from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NewNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notice policies)', () => {
    const testData = {};
    const noticeTemplate = {
      ...NoticePolicyTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.loan }),
      name: `AT_C1453635_PatronNoticeTemplate_${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      return cy.getAdminToken().then(() => {
        return NoticePolicyTemplates.createViaApi(noticeTemplate).then((createdTemplate) => {
          testData.noticeTemplate = createdTemplate;
          const noticePolicy = getDefaultNoticePolicy({
            name: `AT_C1453635_PatronNoticePolicy_${getRandomPostfix()}`,
            templateId: createdTemplate.id,
          });

          return NoticePolicies.createWithTemplateApi(noticePolicy).then(({ body }) => {
            testData.noticePolicy = body;
            return cy
              .createTempUser([Permissions.uiCirculationSettingsNoticePolicies.gui])
              .then((userProperties) => {
                testData.user = userProperties;
              });
          });
        });
      });
    });

    beforeEach('Log in', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.circulationPatronNoticePoliciesPath,
        waiter: NewNoticePolicy.waitLoading,
      });
    });

    after('Delete test data', () => {
      return cy
        .getAdminToken()
        .then(() => NoticePolicies.deleteViaApi(testData.noticePolicy.id))
        .then(() => NoticePolicyTemplates.deleteViaApi(testData.noticeTemplate.id))
        .then(() => Users.deleteViaApi(testData.user.userId));
    });

    it(
      'C1453634 - Format dropdown for patron notice policy "Add notice" displays Email and Text message',
      { tags: ['extendedPath', 'helios', 'C1453634'] },
      () => {
        // Step 1: Open Patron notice policies and verify the New button label
        NewNoticePolicy.verifyPoliciesListPane();
        NewNoticePolicy.verifyNewButtonLabel();

        // Step 2: Open the new patron notice policy form
        NewNoticePolicy.startAdding();
        NewNoticePolicy.verifyNewPolicyForm();

        // Step 3: Add a Loan notice and verify its dropdowns have no selection
        NewNoticePolicy.expandNoticeSection('loan');
        NewNoticePolicy.addEmptyNotice('loan');
        NewNoticePolicy.verifyNoticeRowHasNoSelection('loan');

        // Step 4: Verify the Loan notice Format choices
        NewNoticePolicy.verifyNoticeFormatOptions('loan');

        // Step 5: Add a Request notice and verify its dropdowns have no selection
        NewNoticePolicy.expandNoticeSection('request');
        NewNoticePolicy.addEmptyNotice('request');
        NewNoticePolicy.verifyNoticeRowHasNoSelection('request');

        // Step 6: Verify the Request notice Format choices
        NewNoticePolicy.verifyNoticeFormatOptions('request');

        // Step 7: Add a Fee/fine notice and verify its dropdowns have no selection
        NewNoticePolicy.expandNoticeSection('feeFine');
        NewNoticePolicy.addEmptyNotice('feeFine');
        NewNoticePolicy.verifyNoticeRowHasNoSelection('feeFine');

        // Step 8: Verify the Fee/fine notice Format choices
        NewNoticePolicy.verifyNoticeFormatOptions('feeFine');
      },
    );

    it(
      'C1453635 - Format dropdown shows Email and Text message when editing an existing patron notice policy notice',
      { tags: ['extendedPath', 'helios', 'C1453635'] },
      () => {
        // Step 1: Open the existing policy and verify its Loan notice row
        NewNoticePolicy.openPolicy(testData.noticePolicy.name);
        NewNoticePolicy.verifyPolicyNoticeDetails(
          testData.noticePolicy.name,
          testData.noticeTemplate.name,
          'Email',
        );

        // Step 2: Open Actions > Edit and verify the existing row is present
        NewNoticePolicy.openPolicyForEditing(
          testData.noticePolicy.name,
          testData.noticeTemplate.name,
        );

        // Step 3: Verify the Loan notice Format choices
        NewNoticePolicy.verifyNoticeFormatOptions('loan');

        // Step 4: Select Text message and verify the Format field value
        NewNoticePolicy.selectNoticeFormat('loan', 'Text message');

        // Step 5: Save the policy and verify the changed Format in its detail view
        NewNoticePolicy.saveAndClosePolicy();
        NewNoticePolicy.verifyPolicyNoticeDetails(
          testData.noticePolicy.name,
          testData.noticeTemplate.name,
          'Text message',
        );
      },
    );
  });
});
