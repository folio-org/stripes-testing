/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('MARC Authority - Validation rules', () => {
  let user;
  let authSpecId;
  const ruleDescription = 'Invalid LCCN Subfield Value';
  let lccnRule;
  let initialRuleState;

  before('Create user and get MARC authority specification id', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.specificationStorageSpecificationItemGet.gui,
      Permissions.specificationStorageSpecificationCollectionGet.gui,
      Permissions.specificationStorageSpecificationRulesCollectionGet.gui,
      Permissions.specificationStorageSpecificationRulesItemPatch.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });

    cy.getSpecificationIds()
      .then((specs) => {
        const authSpec = specs.find((s) => s.profile === 'authority');
        expect(authSpec, 'MARC authority specification exists').to.exist;
        authSpecId = authSpec.id;
      })
      .then(() => {
        cy.getSpecificationRules(authSpecId).then((response) => {
          expect(response.status).to.eq(200);
          lccnRule = response.body.rules.find((rule) => rule.name === ruleDescription);
          expect(lccnRule).to.not.be.undefined;
          initialRuleState = lccnRule.enabled;
        });
      });
  });

  after('Delete user', () => {
    cy.getAdminToken();
    if (lccnRule && lccnRule.enabled !== initialRuleState) {
      cy.updateSpecificationRule(authSpecId, lccnRule.id, { enabled: initialRuleState }, false);
    }
    if (user) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C569562 Enable / disable MARC authority "LCCN" structure validation rule (API) (spitfire)',
    { tags: ['C569562', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1 & 2: Get rules and find "Invalid LCCN Subfield Value", verify it is disabled
      expect(initialRuleState).to.be.false;

      // Step 3: Enable the rule
      cy.updateSpecificationRule(authSpecId, lccnRule.id, { enabled: true }).then((response) => {
        expect(response.status).to.eq(204);
      });

      // Step 4: Verify the rule is enabled
      cy.getSpecificationRules(authSpecId).then((response) => {
        expect(response.status).to.eq(200);
        const updatedRule = response.body.rules.find((rule) => rule.id === lccnRule.id);
        expect(updatedRule.enabled).to.be.true;
      });

      // Step 5: Disable the rule
      cy.updateSpecificationRule(authSpecId, lccnRule.id, { enabled: false }).then((response) => {
        expect(response.status).to.eq(204);
      });

      // Step 6: Verify the rule is disabled
      cy.getSpecificationRules(authSpecId).then((response) => {
        expect(response.status).to.eq(200);
        const updatedRule = response.body.rules.find((rule) => rule.id === lccnRule.id);
        expect(updatedRule.enabled).to.be.false;
      });
    },
  );
});
