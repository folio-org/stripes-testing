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
    const getTemplate = (category, name) => ({
      ...NoticePolicyTemplates.getDefaultTemplate({ category }),
      name: `AT_C1464319_${name}_${getRandomPostfix()}`,
    });
    const templates = {
      loan: [1, 2, 3].map((number) => getTemplate(NOTICE_CATEGORIES.loan, `LoanTemplate${number}`)),
      request: [getTemplate(NOTICE_CATEGORIES.request, 'RequestTemplate')],
      feeFine: [getTemplate(NOTICE_CATEGORIES.AutomatedFeeFineCharge, 'FeeFineTemplate')],
    };
    const [loanTemplate1, loanTemplate2, loanTemplate3] = templates.loan;
    const [requestTemplate] = templates.request;
    const [feeFineTemplate] = templates.feeFine;

    const getNotice = (template, sendWhen) => ({
      templateId: template.id,
      format: 'Email',
      realTime: false,
      sendOptions: { sendWhen },
    });
    const getPolicy = (caseId, notices) => ({
      ...getDefaultNoticePolicy({ name: `AT_${caseId}_PatronNoticePolicy_${getRandomPostfix()}` }),
      ...notices,
    });
    const policies = {
      // C1464319: two loan notices, saved after adding and deleting a card
      twoLoanNotices: getPolicy('C1464319', {
        loanNotices: [getNotice(loanTemplate1, 'Check out'), getNotice(loanTemplate2, 'Check in')],
      }),
      // C1464321: three loan notices, never saved
      threeLoanNotices: getPolicy('C1464321', {
        loanNotices: [
          getNotice(loanTemplate1, 'Check out'),
          getNotice(loanTemplate2, 'Check in'),
          getNotice(loanTemplate3, 'Renewed'),
        ],
      }),
      // C1464322, C1464323: exactly one notice in every section, never saved
      oneNoticePerSection: getPolicy('C1464322', {
        loanNotices: [getNotice(loanTemplate1, 'Check out')],
        requestNotices: [getNotice(requestTemplate, 'Hold request')],
        feeFineNotices: [getNotice(feeFineTemplate, 'Overdue fine returned')],
      }),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      Object.values(templates)
        .flat()
        .forEach((template) => NoticePolicyTemplates.createViaApi(template));
      Object.values(policies).forEach((policy) => NoticePolicies.createWithTemplateApi(policy));
      cy.createTempUser([Permissions.uiCirculationSettingsNoticePolicies.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
        },
      );
    });

    beforeEach('Log in', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.circulationPatronNoticePoliciesPath,
        waiter: NewNoticePolicy.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Object.values(policies).forEach((policy) => NoticePolicies.deleteViaApi(policy.id));
      Object.values(templates)
        .flat()
        .forEach((template) => NoticePolicyTemplates.deleteViaApi(template.id));
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1464319 - Add notice above and delete notice cards in an existing patron notice policy - form stays unchanged',
      { tags: ['criticalPath', 'helios', 'C1464319'] },
      () => {
        const policyName = policies.twoLoanNotices.name;
        const originalNotices = [
          { templateName: loanTemplate1.name, format: 'Email', triggeringEvent: 'Check out' },
          { templateName: loanTemplate2.name, format: 'Email', triggeringEvent: 'Check in' },
        ];

        // Step 1: Open the existing policy in edit mode; "Save & close" is disabled
        NewNoticePolicy.openPolicy(policyName);
        NewNoticePolicy.openPolicyForEditing(policyName, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyNoticeCards('loan', originalNotices);
        NewNoticePolicy.verifySaveAndCloseDisabled();

        // Step 2: Verify "Add notice above" is shown to the left of "Delete notice"
        NewNoticePolicy.verifyNoticeCardActionIcons('loan', 2);

        // Step 3: Click "Add notice above" on Notice 2
        NewNoticePolicy.clickAddNoticeAbove('loan', 1);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          loanTemplate1.name,
          '',
          loanTemplate2.name,
        ]);

        // Step 4: Click "Delete notice" on the newly inserted card; the original arrangement is back
        NewNoticePolicy.clickDeleteNotice('loan', 1);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyNoticeCards('loan', originalNotices);

        // Step 5: "Save & close" is disabled - the form has no changes
        NewNoticePolicy.verifySaveAndCloseDisabled();

        // Step 6: Close the form with the X icon; no unsaved-changes modal, detail view is shown
        NewNoticePolicy.closePolicyFormWithoutUnsavedChangesModal();
        NewNoticePolicy.verifyPolicyDetailsPane(policyName);

        // Step 7: Reopen the policy in edit mode; the cards are the same as before step 3
        NewNoticePolicy.openPolicyForEditing(policyName, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyNoticeCards('loan', originalNotices);
      },
    );

    it(
      'C1464320 - "Add notice above" and "Delete notice" icons and tooltips on a new patron notice policy',
      { tags: ['extendedPath', 'helios', 'C1464320'] },
      () => {
        // Step 1: Open the new patron notice policy form
        NewNoticePolicy.startAdding();
        NewNoticePolicy.verifyNewPolicyForm();

        // Step 2: Add a Loan notice; its Template, Format and Triggering event fields are empty.
        // Frequency is only rendered after a "Before"/"After" send option is chosen.
        NewNoticePolicy.expandNoticeSection('loan');
        NewNoticePolicy.addEmptyNotice('loan', 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 1);

        // Step 3: Verify "Add notice above" is shown to the left of "Delete notice"
        NewNoticePolicy.verifyNoticeCardActionIcons('loan', 1);

        // Step 4: Hover the plus icon
        NewNoticePolicy.hoverNoticeCardControl('loan', 0, 'addNoticeAbove');
        NewNoticePolicy.verifyNoticeCardControlTooltip('addNoticeAbove');

        // Step 5: Hover the trash icon
        NewNoticePolicy.hoverNoticeCardControl('loan', 0, 'deleteNotice');
        NewNoticePolicy.verifyNoticeCardControlTooltip('deleteNotice');
      },
    );

    it(
      'C1464321 - "Add notice above" inserts cards at correct position with sequential renumbering',
      { tags: ['extendedPath', 'helios', 'C1464321'] },
      () => {
        const originalTemplates = [loanTemplate1.name, loanTemplate2.name, loanTemplate3.name];

        // Precondition: the policy is in edit mode with Notice 1-3
        NewNoticePolicy.openPolicy(policies.threeLoanNotices.name);
        NewNoticePolicy.openPolicyForEditing(policies.threeLoanNotices.name, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', originalTemplates);

        // Step 1: Click "Add notice above" on Notice 1
        NewNoticePolicy.clickAddNoticeAbove('loan', 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 4);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', ['', ...originalTemplates]);

        // Step 2: Click "Add notice above" on the middle card (Notice 3)
        NewNoticePolicy.clickAddNoticeAbove('loan', 2);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 5);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          '',
          loanTemplate1.name,
          '',
          loanTemplate2.name,
          loanTemplate3.name,
        ]);

        // Step 3: Delete the two newly added cards
        NewNoticePolicy.clickDeleteNotice('loan', 2);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 4);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', ['', ...originalTemplates]);
        NewNoticePolicy.clickDeleteNotice('loan', 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', originalTemplates);
      },
    );

    it(
      'C1464322 - "Add notice above"/"Delete notice" work in Loan, Request and Fee/fine notice sections',
      { tags: ['extendedPath', 'helios', 'C1464322'] },
      () => {
        const existingTemplates = {
          loan: loanTemplate1.name,
          request: requestTemplate.name,
          feeFine: feeFineTemplate.name,
        };
        const verifyAddAboveAndDelete = (sectionName) => {
          const existingTemplate = existingTemplates[sectionName];

          NewNoticePolicy.expandNoticeSection(sectionName);
          NewNoticePolicy.addEmptyNotice(sectionName, 1);
          NewNoticePolicy.verifyNoticeCardLabels(sectionName, 2);
          NewNoticePolicy.verifyNoticeCardActionIcons(sectionName, 2);

          NewNoticePolicy.clickAddNoticeAbove(sectionName, 0);
          NewNoticePolicy.verifyNoticeCardLabels(sectionName, 3);
          NewNoticePolicy.verifyNoticeTemplatesOrder(sectionName, ['', existingTemplate, '']);

          NewNoticePolicy.clickDeleteNotice(sectionName, 0);
          NewNoticePolicy.verifyNoticeCardLabels(sectionName, 2);
          NewNoticePolicy.verifyNoticeTemplatesOrder(sectionName, [existingTemplate, '']);
        };

        NewNoticePolicy.openPolicy(policies.oneNoticePerSection.name);
        NewNoticePolicy.openPolicyForEditing(policies.oneNoticePerSection.name, loanTemplate1.name);

        // Step 1: Add a Loan notice, then use "Add notice above" and "Delete notice"
        verifyAddAboveAndDelete('loan');

        // Step 2: Repeat in Request notices; Loan cards are unaffected
        verifyAddAboveAndDelete('request');
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [existingTemplates.loan, '']);

        // Step 3: Repeat in Fee/fine notices; Loan and Request cards are unaffected
        verifyAddAboveAndDelete('feeFine');
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [existingTemplates.loan, '']);
        NewNoticePolicy.verifyNoticeTemplatesOrder('request', [existingTemplates.request, '']);
      },
    );

    it(
      'C1464323 - Deleting the only remaining notice card returns the section to empty state',
      { tags: ['extendedPath', 'helios', 'C1464323'] },
      () => {
        // Precondition: the policy is in edit mode with exactly one Loan notice
        NewNoticePolicy.openPolicy(policies.oneNoticePerSection.name);
        NewNoticePolicy.openPolicyForEditing(policies.oneNoticePerSection.name, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 1);

        // Step 1: Click "Delete notice" on the single Notice card
        NewNoticePolicy.clickDeleteNotice('loan', 0);
        NewNoticePolicy.verifyNoNoticeCards('loan');

        // Step 2: Click "Add notice"
        NewNoticePolicy.addEmptyNotice('loan', 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 1);
        NewNoticePolicy.verifyNoticeCardActionIcons('loan', 1);
      },
    );
  });
});
