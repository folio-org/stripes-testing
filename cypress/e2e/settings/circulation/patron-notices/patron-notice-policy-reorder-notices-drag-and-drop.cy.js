import Permissions from '../../../../support/dictionary/permissions';
import NoticePolicyTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NoticePolicies, {
  getDefaultNoticePolicy,
  NOTICE_CATEGORIES,
} from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NewNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notice policies)', () => {
    const testData = {};
    const getTemplate = (category, name) => ({
      ...NoticePolicyTemplates.getDefaultTemplate({ category }),
      name: `AT_C1464326_${name}_${getRandomPostfix()}`,
    });
    const templates = {
      loan: [1, 2, 3].map((number) => getTemplate(NOTICE_CATEGORIES.loan, `LoanTemplate${number}`)),
      request: [1, 2].map((number) =>
        getTemplate(NOTICE_CATEGORIES.request, `RequestTemplate${number}`),
      ),
      feeFine: [1, 2].map((number) =>
        getTemplate(NOTICE_CATEGORIES.AutomatedFeeFineCharge, `FeeFineTemplate${number}`),
      ),
    };
    const [loanTemplate1, loanTemplate2, loanTemplate3] = templates.loan;
    const [requestTemplate1, requestTemplate2] = templates.request;
    const [feeFineTemplate1, feeFineTemplate2] = templates.feeFine;

    const getNotice = (template, sendWhen) => ({
      templateId: template.id,
      format: 'Email',
      realTime: false,
      sendOptions: { sendWhen },
    });
    const threeLoanNotices = [
      getNotice(loanTemplate1, 'Check out'),
      getNotice(loanTemplate2, 'Check in'),
      getNotice(loanTemplate3, 'Renewed'),
    ];
    const getPolicy = (caseId, notices) => ({
      ...getDefaultNoticePolicy({ name: `AT_${caseId}_PatronNoticePolicy_${getRandomPostfix()}` }),
      ...notices,
    });
    const policies = {
      // C1464326: three loan notices, saved after reordering
      reorder: getPolicy('C1464326', { loanNotices: threeLoanNotices }),
      // C1464330: three loan notices with distinct templates, saved after reordering
      persist: getPolicy('C1464330', { loanNotices: threeLoanNotices }),
      // C1464327, C1464328, C1464329: two notices in every section, never saved
      shared: getPolicy('C1464328', {
        loanNotices: [getNotice(loanTemplate1, 'Check out'), getNotice(loanTemplate2, 'Check in')],
        requestNotices: [
          getNotice(requestTemplate1, 'Hold request'),
          getNotice(requestTemplate2, 'Recall request'),
        ],
        feeFineNotices: [
          getNotice(feeFineTemplate1, 'Overdue fine returned'),
          getNotice(feeFineTemplate2, 'Overdue fine renewed'),
        ],
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
      'C1464326 - Reorder patron notice cards via drag & drop with sequential renumbering',
      { tags: ['criticalPath', 'helios', 'C1464326'] },
      () => {
        // Step 1: Open the existing policy in edit mode
        NewNoticePolicy.openPolicy(policies.reorder.name);
        NewNoticePolicy.openPolicyForEditing(policies.reorder.name, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);

        // Step 2: Verify a drag & drop handle is shown to the left of each "Notice #" label
        NewNoticePolicy.verifyDragHandlesShown('loan', 3);

        // Step 3: Drag "Notice 1" and drop it below "Notice 3"
        NewNoticePolicy.dragNoticeCard('loan', 0, 2);

        // Step 4: Verify cards renumber sequentially and the moved card keeps its configuration
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          loanTemplate2.name,
          loanTemplate3.name,
          loanTemplate1.name,
        ]);

        // Step 5: Save & close the policy
        NewNoticePolicy.saveAndClosePolicy();
        InteractorsTools.checkCalloutMessage(
          `The Patron notice policy ${policies.reorder.name} was successfully updated.`,
        );
        NewNoticePolicy.verifyPoliciesListPane();
      },
    );

    it(
      'C1464327 - Drag & drop handle and tooltip present on existing and new patron notice policies',
      { tags: ['extendedPath', 'helios', 'C1464327'] },
      () => {
        // Step 1: Open the existing policy in edit mode and verify the drag & drop handles
        NewNoticePolicy.openPolicy(policies.shared.name);
        NewNoticePolicy.openPolicyForEditing(policies.shared.name, loanTemplate1.name);
        NewNoticePolicy.verifyDragHandlesShown('loan', 2);

        // Step 2: Hover over the drag & drop handle and verify the tooltip
        NewNoticePolicy.hoverNoticeCardControl('loan', 0, 'dragHandle');
        NewNoticePolicy.verifyNoticeCardControlTooltip('dragHandle');

        // Step 3: Create a new policy and add two Loan notices
        NewNoticePolicy.cancelPolicyForm();
        NewNoticePolicy.startAdding();
        NewNoticePolicy.verifyNewPolicyForm();
        NewNoticePolicy.expandNoticeSection('loan');
        NewNoticePolicy.addEmptyNotice('loan', 0);
        NewNoticePolicy.addEmptyNotice('loan', 1);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyDragHandlesShown('loan', 2);

        // Step 4: Hover over the drag & drop handle on a card of the new policy
        NewNoticePolicy.hoverNoticeCardControl('loan', 1, 'dragHandle');
        NewNoticePolicy.verifyNoticeCardControlTooltip('dragHandle');
      },
    );

    it(
      'C1464328 - Reorder notice cards independently in Loan, Request and Fee/fine notice accordions',
      { tags: ['extendedPath', 'helios', 'C1464328'] },
      () => {
        const reorderedLoanTemplates = [loanTemplate2.name, loanTemplate1.name];
        const reorderedRequestTemplates = [requestTemplate2.name, requestTemplate1.name];

        // Step 1: Open the policy in edit mode and verify every accordion shows cards with handles
        NewNoticePolicy.openPolicy(policies.shared.name);
        NewNoticePolicy.openPolicyForEditing(policies.shared.name, loanTemplate1.name);
        ['loan', 'request', 'feeFine'].forEach((sectionName) => {
          NewNoticePolicy.expandNoticeSection(sectionName);
          NewNoticePolicy.verifyDragHandlesShown(sectionName, 2);
        });

        // Step 2: Drag Loan Notice 1 below Notice 2
        NewNoticePolicy.dragNoticeCard('loan', 0, 1);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', reorderedLoanTemplates);

        // Step 3: Drag Request Notice 1 below Notice 2; Loan order is unchanged
        NewNoticePolicy.dragNoticeCard('request', 0, 1);
        NewNoticePolicy.verifyNoticeCardLabels('request', 2);
        NewNoticePolicy.verifyNoticeTemplatesOrder('request', reorderedRequestTemplates);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', reorderedLoanTemplates);

        // Step 4: Drag Fee/fine Notice 1 below Notice 2; Loan and Request order is unchanged
        NewNoticePolicy.dragNoticeCard('feeFine', 0, 1);
        NewNoticePolicy.verifyNoticeCardLabels('feeFine', 2);
        NewNoticePolicy.verifyNoticeTemplatesOrder('feeFine', [
          feeFineTemplate2.name,
          feeFineTemplate1.name,
        ]);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', reorderedLoanTemplates);
        NewNoticePolicy.verifyNoticeTemplatesOrder('request', reorderedRequestTemplates);
      },
    );

    it(
      'C1464329 - Combine drag & drop reorder with Add notice above, Add notice and Delete notice',
      { tags: ['extendedPath', 'helios', 'C1464329'] },
      () => {
        // Step 1: Open the policy in edit mode and verify card controls
        NewNoticePolicy.openPolicy(policies.shared.name);
        NewNoticePolicy.openPolicyForEditing(policies.shared.name, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyDragHandlesShown('loan', 2);
        NewNoticePolicy.verifyNoticeCardActionIcons('loan', 2);

        // Step 2: Click "Add notice above" on Notice 2
        NewNoticePolicy.clickAddNoticeAbove('loan', 1);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          loanTemplate1.name,
          '',
          loanTemplate2.name,
        ]);

        // Step 3: Drag the newly inserted card to the top of the list
        NewNoticePolicy.dragNoticeCard('loan', 1, 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          '',
          loanTemplate1.name,
          loanTemplate2.name,
        ]);

        // Step 4: Click "Delete notice" on Notice 1
        NewNoticePolicy.clickDeleteNotice('loan', 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 2);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          loanTemplate1.name,
          loanTemplate2.name,
        ]);

        // Step 5: Click "Add notice", then drag the appended card above Notice 1
        NewNoticePolicy.addEmptyNotice('loan', 2);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.dragNoticeCard('loan', 2, 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          '',
          loanTemplate1.name,
          loanTemplate2.name,
        ]);
      },
    );

    it(
      'C1464330 - Reordered notice cards persist after Save & close and reopen',
      { tags: ['criticalPath', 'helios', 'C1464330'] },
      () => {
        const reorderedTemplates = [loanTemplate3.name, loanTemplate1.name, loanTemplate2.name];

        // Step 1: Open the policy in edit mode and note the card order
        NewNoticePolicy.openPolicy(policies.persist.name);
        NewNoticePolicy.openPolicyForEditing(policies.persist.name, loanTemplate1.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', [
          loanTemplate1.name,
          loanTemplate2.name,
          loanTemplate3.name,
        ]);

        // Step 2: Drag Notice 3 to the top of the list
        NewNoticePolicy.dragNoticeCard('loan', 2, 0);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', reorderedTemplates);

        // Step 3: Save & close the policy
        NewNoticePolicy.saveAndClosePolicy();
        InteractorsTools.checkCalloutMessage(
          `The Patron notice policy ${policies.persist.name} was successfully updated.`,
        );
        NewNoticePolicy.verifyPoliciesListPane();

        // Step 4: Reopen the policy in edit mode and verify the saved order
        NewNoticePolicy.openPolicy(policies.persist.name);
        NewNoticePolicy.openPolicyForEditing(policies.persist.name, loanTemplate3.name);
        NewNoticePolicy.verifyNoticeCardLabels('loan', 3);
        NewNoticePolicy.verifyNoticeTemplatesOrder('loan', reorderedTemplates);
      },
    );
  });
});
