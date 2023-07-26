import { kebabCase } from 'lodash';
import {
  Button,
  CodeMirror,
  CodeMirrorHint,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';


const calloutMessages = {
  CIRCULATION_RULES_UPDATE_SUCCESS: 'Rules were successfully updated.',
};

export default {
  defaultcirculationPolicy: {
    'rulesAsText': 'circulation policy'
  },

  verifyError() {
    cy.expect(cy.get("[class^='rule-error']").contains('Must contain one of each policy type, missing type r'));
  },

  policyError({
    priorityType,
    priorityTypeName,
    loanPolicyName,
  }) {
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
  },

  fillInFallbackPolicy(policyData) {
    this.fillInCirculationRules('fallback-policy: ');
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
    }
    this.fillInCirculationRules('l ');
    this.clickCirculationRulesHintItem(loanPolicyName);
    this.fillInCirculationRules('o ');
    this.clickCirculationRulesHintItem(overdueFinePolicyName);
    this.fillInCirculationRules('i ');
    this.clickCirculationRulesHintItem(lostItemFeePolicyName);
    this.fillInCirculationRules('r ');
    this.clickCirculationRulesHintItem(requestPolicyName);
    this.fillInCirculationRules('n ');
    this.clickCirculationRulesHintItem(noticePolicyName);
    this.fillInNewLine();
  },

  clickCirculationRulesHintItem(name) {
    cy.do(CodeMirrorHint().clickItem(kebabCase(name)));
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
      'o': defaultRules.substring(oIndex + 3, oIndex + 39),
      'l': defaultRules.substring(lIndex + 3, lIndex + 39),
      'i': defaultRules.substring(iIndex + 3, iIndex + 39),
      'r': defaultRules.substring(rIndex + 3, rIndex + 39),
      'n': defaultRules.substring(nIndex + 3, nIndex + 39)
    };
    return baseRuleProps;
  },

  addRuleViaApi(defaultRules, ruleParams, priority, priorityId) {
    const withNewRule = defaultRules + ' \n' + priority + priorityId + ': i ' + ruleParams.i + ' l ' + ruleParams.l + ' r ' + ruleParams.r + ' o ' + ruleParams.o + ' n ' + ruleParams.n;
    return cy.updateCirculationRules({ rulesAsText: withNewRule });
  },

  deleteRuleViaApi(rule) {
    this.getViaApi().then((circulationRules) => {
      const allRules = circulationRules.rulesAsText;
      cy.updateCirculationRules({ rulesAsText: allRules.replace(rule, '') });
    });
  }
};
