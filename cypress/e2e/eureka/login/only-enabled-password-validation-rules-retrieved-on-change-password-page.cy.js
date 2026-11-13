import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ChangePassword from '../../../support/fragments/settings/my-profile/change-password';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Login', () => {
    // seeded as Disabled by mod-password-validator; "password.whiteSpace.invalid" if it were applied
    const disabledRuleName = 'no_white_space_character';
    const { messages } = ChangePassword;
    // each password violates one Enabled rule only
    const passwordsViolatingEnabledRules = [
      { password: 'Pi1!Ban', message: messages.notEnoughSymbols },
      { password: 'Pilot!Banana', message: messages.noNumber },
      { password: 'Pilot1Banana', message: messages.noSpecialCharacter },
      { password: 'pilot1!banana', message: messages.noLowerAndUpperCase },
      { password: 'PILOT1!BANANA', message: messages.noLowerAndUpperCase },
      { password: 'Pilot  1!Banana', message: messages.consecutiveWhitespaces },
    ];
    const testData = {
      enabledRuleNames: [],
      // contains a single white space, which only the Disabled rule would reject; satisfies
      // all the Enabled rules (length, number, special character, upper and lower case)
      newPassword: `At Pw!${getRandomLetters(6)}9`,
    };

    before('Prepare the password rules, create user', () => {
      cy.getAdminToken();
      cy.getPasswordValidationRulesApi().then(({ body }) => {
        const disabledRule = body.rules.find(({ name }) => name === disabledRuleName);

        expect(disabledRule, `the rule "${disabledRuleName}" exists`).to.exist;
        // Disabled by default, so the rule is changed only if someone has enabled it
        if (disabledRule.state !== 'Disabled') {
          cy.updatePasswordValidationRuleApi({ ...disabledRule, state: 'Disabled' });
        }
        testData.enabledRuleNames = body.rules
          .filter(({ name, state }) => state === 'Enabled' && name !== disabledRuleName)
          .map(({ name }) => name);
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiMyprofileSettingsChangePasswordView],
        );
      });

      cy.then(() => {
        cy.login(testData.user.username, testData.user.password, { authRefresh: true });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1574512 Only enabled password validation rules are retrieved on Change password page (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1574512'] },
      () => {
        // Step 1: Profile menu > "Change Password"; the pane opens (the rules request is watched)
        cy.intercept('GET', /\/tenant\/rules/).as('getPasswordRules');
        ChangePassword.openChangePasswordViaUserProfile();

        cy.wait('@getPasswordRules').then(({ request, response }) => {
          // Step 2: The request has limit = 100 and query = ruleState=="ENABLED"
          const { searchParams } = new URL(request.url);

          expect(searchParams.get('limit')).to.eq('100');
          expect(searchParams.get('query')).to.eq('ruleState=="ENABLED"');

          // Step 3: The response contains only the Enabled rules
          const ruleNames = response.body.rules.map(({ name }) => name);

          response.body.rules.forEach(({ name, state }) => {
            expect(state, `state of the rule "${name}"`).to.eq('Enabled');
          });
          expect(ruleNames).to.have.members(testData.enabledRuleNames);
          expect(ruleNames).to.not.include(disabledRuleName);
        });

        // Step 4: The Enabled rules are applied (a message for each violation)
        ChangePassword.typeCurrentPassword(testData.user.password);
        passwordsViolatingEnabledRules.forEach(({ password, message }) => {
          ChangePassword.typeNewPassword(password);
          ChangePassword.verifyNewPasswordMessage(message);
        });
        ChangePassword.typeNewPassword(`Xx1!${testData.user.username}`);
        ChangePassword.verifyNewPasswordMessage(messages.containsUsername);

        // Step 4: The Disabled rule is not applied (a password with a white space is saved)
        ChangePassword.typeNewPassword(testData.newPassword);
        ChangePassword.typeConfirmPassword(testData.newPassword);
        ChangePassword.saveNewPassword();
        ChangePassword.verifyPasswordSaved();

        // Step 4: Log in with the new password
        cy.logout();
        cy.login(testData.user.username, testData.newPassword);
      },
    );
  });
});
