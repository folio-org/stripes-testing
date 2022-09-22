import Groups from '../../../support/fragments/finance/groups/groups';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import testType from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import devTeams from '../../../support/dictionary/devTeams';
import NewGroup from '../../../support/fragments/finance/groups/newGroup';

describe('ui-finance: Group creation', () => {
  const defaultGroup = { ...NewGroup.defaultGroup };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.groupsPath);
  });

  it('C4054 Create a new fund group (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    Groups.createDefaultGroup(defaultGroup);
    Groups.checkCreatedGroup(defaultGroup);
    Groups.deleteGroupViaActions(defaultGroup);

    // should not create new ledger if mandatory fields are not filled
    const testGroupName = `autotest_group_${getRandomPostfix()}`;
    Groups.tryToCreateGroupWithoutMandatoryFields(testGroupName);
  });
});
