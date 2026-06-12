import Permissions from '../../../support/dictionary/permissions';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicy, { defaultLoanPolicy } from '../../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../../support/fragments/circulation/overdue-fine-policy';
import RequestPolicy, {
  defaultRequestPolicy,
} from '../../../support/fragments/circulation/request-policy';
import NoticePolicy, {
  defaultNoticePolicy,
} from '../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Settings (Circulation)', () => {
  let testUser;
  let patronGroupId;
  let addedCirculationRule;

  const patronGroup = {
    name: getTestEntityValue('group'),
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.uiCirculationViewCreateEditDelete.gui]).then((userProps) => {
      testUser = userProps;

      cy.getAdminToken();

      LoanPolicy.createLoanableNotRenewableLoanPolicyApi(defaultLoanPolicy);
      LostItemFeePolicy.createViaApi();
      OverdueFinePolicy.createViaApi();
      RequestPolicy.createViaApi(defaultRequestPolicy);
      NoticePolicy.createApi();

      PatronGroups.createViaApi(patronGroup.name).then((id) => {
        patronGroupId = id;
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (addedCirculationRule) {
      CirculationRules.deleteRuleViaApi(addedCirculationRule);
    }
    LoanPolicy.deleteApi(defaultLoanPolicy.id);
    LostItemFeePolicy.deleteViaApi(defaultLostItemFeePolicy.id);
    OverdueFinePolicy.deleteViaApi(defaultOverdueFinePolicy.id);
    RequestPolicy.deleteViaApi(defaultRequestPolicy.id);
    NoticePolicy.deleteViaApi(defaultNoticePolicy.id);
    PatronGroups.deleteViaApi(patronGroupId);
    Users.deleteViaApi(testUser.userId);
  });

  it(
    'C5559 Verify that you can associate an overdue fine and lost item fee policies with a circulation rule (vega)',
    { tags: ['criticalPath', 'vega', 'C5559'] },
    () => {
      // Pre-build the rule string for cleanup in after hook
      addedCirculationRule =
        'g ' +
        patronGroupId +
        ' : o ' +
        defaultOverdueFinePolicy.id +
        ' i ' +
        defaultLostItemFeePolicy.id +
        ' l ' +
        defaultLoanPolicy.id +
        ' r ' +
        defaultRequestPolicy.id +
        ' n ' +
        defaultNoticePolicy.id;

      cy.login(testUser.username, testUser.password, {
        path: SettingsMenu.circulationRulesPath,
        waiter: () => cy.wait(5000),
      });

      // Step 1: "Circulation rules editor" pane opened

      // Step 2: Click on the first empty line — move cursor to end and add a new line
      CirculationRules.moveCursorFocusToTheEnd();
      CirculationRules.fillInNewLine();

      // Step 3: Select "g" (patron group) attribute > select patron group value
      CirculationRules.verifyHintExists();
      CirculationRules.fillInCirculationRules('g ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(patronGroup.name);

      // Step 4: Enter colon after "g [patronGroup]" — a menu of circulation policies appears
      CirculationRules.fillInCirculationRules(': ');
      cy.wait(2000);
      CirculationRules.moveCursorFocusToTheEnd();

      // Step 5: Type "o " > select the Overdue Fine Policy
      CirculationRules.verifyHintExists();
      CirculationRules.fillInCirculationRules('o ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(defaultOverdueFinePolicy.name);

      // Step 6: Type "i " > select the Lost Item Fee Policy
      CirculationRules.fillInCirculationRules('i ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(defaultLostItemFeePolicy.name);

      // Step 7: Do the same for "l " (Loan Policy), "r " (Request Policy) and "n " (Patron Notice Policy)
      CirculationRules.fillInCirculationRules('l ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(defaultLoanPolicy.name);

      CirculationRules.fillInCirculationRules('r ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(defaultRequestPolicy.name);

      CirculationRules.fillInCirculationRules('n ');
      CirculationRules.verifyHintExists();
      CirculationRules.clickCirculationRulesHintItem(defaultNoticePolicy.name);

      // Step 8: Click "Save" — "Rules were successfully updated." callout appears
      CirculationRules.saveCirculationRules();
      CirculationRules.checkUpdateCirculationRulesCalloutAppeared();

      // Step 9: Reload the page — rule is preserved with all selected values
      cy.reload();
      cy.wait(3000);

      cy.get('.react-codemirror2').should('exist');

      CirculationRules.checkCirculationRulesContainTextViaApi(`g ${patronGroupId}`);
      CirculationRules.checkCirculationRulesContainTextViaApi(`o ${defaultOverdueFinePolicy.id}`);
      CirculationRules.checkCirculationRulesContainTextViaApi(`i ${defaultLostItemFeePolicy.id}`);
      CirculationRules.checkCirculationRulesContainTextViaApi(`l ${defaultLoanPolicy.id}`);
      CirculationRules.checkCirculationRulesContainTextViaApi(`r ${defaultRequestPolicy.id}`);
      CirculationRules.checkCirculationRulesContainTextViaApi(`n ${defaultNoticePolicy.id}`);
    },
  );
});
