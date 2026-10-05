import Groups from '../../../../support/fragments/finance/groups/groups';
import NewGroup from '../../../../support/fragments/finance/groups/newGroup';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Groups', () => {
  const defaultGroup = { ...NewGroup.defaultGroup };

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password);
    cy.allure().logCommandSteps(true);
    cy.visit(TopMenu.groupsPath);
  });

  it(
    'C4054 Create a new fund group (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C4054'] },
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
