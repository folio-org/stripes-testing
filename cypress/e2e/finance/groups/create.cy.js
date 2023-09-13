import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Groups from '../../../support/fragments/finance/groups/groups';
import TopMenu from '../../../support/fragments/topMenu';
import NewGroup from '../../../support/fragments/finance/groups/newGroup';

describe('ui-finance: Groups', () => {
  const defaultGroup = { ...NewGroup.defaultGroup };

  before(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.groupsPath);
  });

  it(
    'C4054 Create a new fund group (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Groups.createDefaultGroup(defaultGroup);
      Groups.checkCreatedGroup(defaultGroup);
      Groups.deleteGroupViaActions(defaultGroup);

      // should not create new ledger if mandatory fields are not filled
      const testGroupName = 'autotest_group_';
      Groups.tryToCreateGroupWithoutMandatoryFields(testGroupName);
    },
  );
});
