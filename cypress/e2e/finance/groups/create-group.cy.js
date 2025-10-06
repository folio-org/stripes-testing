import Groups from '../../../support/fragments/finance/groups/groups';
import NewGroup from '../../../support/fragments/finance/groups/newGroup';
import TopMenu from '../../../support/fragments/topMenu';

describe('ui-finance: Groups', () => {
  const defaultGroup = { ...NewGroup.defaultGroup };

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });
    });
  });

  it(
    'C4054 Create a new fund group (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
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
