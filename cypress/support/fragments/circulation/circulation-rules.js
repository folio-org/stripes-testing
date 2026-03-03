// eslint-disable-next-line import/no-extraneous-dependencies
import { kebabCase } from 'lodash';
import { HTML, Button, CodeMirror, CodeMirrorHint } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const calloutMessages = {
  CIRCULATION_RULES_UPDATE_SUCCESS: 'Rules were successfully updated.',
  CIRCULATION_RULES_ERROR_MISSING_N_TYPE: 'Must contain one of each policy type, missing type n',
  CIRCULATION_RULES_ERROR_WRONG_INPUT:
    "mismatched input 'wrong' expecting {, CRITERIUM_LETTER, NEWLINE}",
};

export default {
  defaultcirculationPolicy: {
    rulesAsText: 'circulation policy',
  },

  verifyErrorMessageMissingNType() {
    cy.expect(
      CodeMirror().find(HTML(calloutMessages.CIRCULATION_RULES_ERROR_MISSING_N_TYPE)).exists(),
    );
  },

  verifyErrorMessageWrongInput() {
    cy.expect(
      CodeMirror().find(HTML(calloutMessages.CIRCULATION_RULES_ERROR_WRONG_INPUT)).exists(),
    );
  },

  policyError({ priorityType, priorityTypeName, loanPolicyName }) {
    if (priorityType) {
      this.fillInCirculationRules(priorityType);
      this.clickCirculationRulesHintItem(priorityTypeName);
      this.fillInCirculationRules(': ');
    }
    this.fillInCirculationRules('l ');
    this.clickCirculationRulesHintItem(loanPolicyName);
  },

  clearCirculationRules() {
    cy.do(CodeMirror().clear());
  },

  fillInCirculationRules(value) {
    cy.do(CodeMirror().fillIn(value));
  },

  fillInPriority(value = 'priority: t, s, c, b, a, m, g') {
    this.fillInCirculationRules(value);
    this.fillInNewLine();
  },

  fillInNewLine() {
    this.fillInCirculationRules('\n');
    cy.wait(2000);
  },

  moveCursorFocusToTheEnd() {
    cy.get('.react-codemirror2').type('{moveToEnd}');
  },

  verifyHintExists() {
    cy.expect(CodeMirrorHint().exists());
  },

  verifyDropdownHasAtLeastItems(count) {
    cy.get('.CodeMirror-hints .CodeMirror-hint').should('have.length.at.least', count);
  },

  verifyDropdownContainsText(text) {
    cy.get('.CodeMirror-hints').should('contain.text', text);
  },

  fillInFallbackPolicy(policyData) {
    this.fillInCirculationRules('fallback-policy: ');
    cy.wait(2000);
    this.moveCursorFocusToTheEnd();
    this.fillInPolicy(policyData);
  },

  fillInPolicy({
    priorityType,
    priorityTypeName,
    loanPolicyName,
    overdueFinePolicyName,
    lostItemFeePolicyName,
    requestPolicyName,
    noticePolicyName,
  }) {
    if (priorityType) {
      this.fillInCirculationRules(priorityType);
      this.clickCirculationRulesHintItem(priorityTypeName);
      this.fillInCirculationRules(': ');
      cy.wait(2000);
    }
    this.fillInCirculationRules('l ');
    this.clickCirculationRulesHintItem(loanPolicyName);
    this.fillInCirculationRules('o ');
    this.clickCirculationRulesHintItem(overdueFinePolicyName);
    this.fillInCirculationRules('i ');
    this.clickCirculationRulesHintItem(lostItemFeePolicyName);
    this.fillInCirculationRules('r ');
    this.clickCirculationRulesHintItem(requestPolicyName);
    if (noticePolicyName) {
      this.fillInCirculationRules('n ');
      this.clickCirculationRulesHintItem(noticePolicyName);
    }
    this.fillInNewLine();
  },

  clickCirculationRulesHintItem(name) {
    cy.expect(CodeMirrorHint().exists());
    cy.do(CodeMirrorHint().clickItem(kebabCase(name)));
  },

  clickCirculationRulesHintItemForPolicyType(name) {
    cy.expect(CodeMirrorHint().exists());
    cy.do(CodeMirrorHint().clickItem(name));
  },

  saveCirculationRules() {
    cy.expect(Button('Save').exists());
    cy.do(Button('Save').click());
  },

  verifyToast() {
    InteractorsTools.checkCalloutMessage('Rules were successfully updated.');
  },

  checkUpdateCirculationRulesCalloutAppeared() {
    InteractorsTools.checkCalloutMessage(calloutMessages.CIRCULATION_RULES_UPDATE_SUCCESS);
  },

  checkNoticePolicyAddedToCirculationRules(noticePolicyId) {
    this.getViaApi().then((circulationRules) => {
      cy.expect(circulationRules.rulesAsText).to.include(`n ${noticePolicyId}`);
    });
  },

  checkCirculationRulesContainTextViaApi(text) {
    this.getViaApi().then((circulationRules) => {
      cy.expect(circulationRules.rulesAsText).to.include(text);
    });
  },

  getViaApi() {
    return cy.getCirculationRules();
  },

  updateViaApi(data) {
    return cy.updateCirculationRules(data);
  },

  getRuleProps(defaultRules) {
    const oIndex = defaultRules.indexOf(' o ', 2);
    const lIndex = defaultRules.indexOf(' l ', 2);
    const iIndex = defaultRules.indexOf(' i ', 2);
    const rIndex = defaultRules.indexOf(' r ', 2);
    const nIndex = defaultRules.indexOf(' n ', 2);
    const baseRuleProps = {
      o: defaultRules.substring(oIndex + 3, oIndex + 39),
      l: defaultRules.substring(lIndex + 3, lIndex + 39),
      i: defaultRules.substring(iIndex + 3, iIndex + 39),
      r: defaultRules.substring(rIndex + 3, rIndex + 39),
      n: defaultRules.substring(nIndex + 3, nIndex + 39),
    };
    return baseRuleProps;
  },

  updateCirculationRules(updatedRules) {
    return this.updateViaApi({ rulesAsText: updatedRules }).then((res) => {
      if (res.status >= 400 && res.status < 500 && res.body.message.includes('does not exist')) {
        let fixedRules = updatedRules.split('\n');
        fixedRules.splice(res.body.line - 1, 1);
        fixedRules = fixedRules.join('\n');
        return this.updateCirculationRules(fixedRules);
      } else if (res.status >= 400) {
        throw new Error(`Circulation rule cannot be created because of "${res.body.message}"`);
      } else {
        const addedRule = updatedRules.split('\n');
        return `\n${addedRule[addedRule.length - 1]}`;
      }
    });
  },

  addRuleViaApi(priorities, ruleProps) {
    return this.getViaApi().then(({ rulesAsText }) => {
      const newProps = { ...this.getRuleProps(rulesAsText), ...ruleProps };
      const rulePriority = Object.entries(priorities)
        .map((priority) => priority.join(' '))
        .join(' + ');
      const newRule = `\n${rulePriority}: l ${newProps.l} r ${newProps.r} n ${newProps.n} o ${newProps.o} i ${newProps.i}`;
      return this.updateCirculationRules(rulesAsText + newRule);
    });
  },

  deleteRuleViaApi(addedRule) {
    this.getViaApi().then(({ rulesAsText }) => {
      this.updateCirculationRules(rulesAsText.replace(addedRule, ''));
    });
  },
};
