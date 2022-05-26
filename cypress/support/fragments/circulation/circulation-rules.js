import { kebabCase } from 'lodash';
import {
  CodeMirror,
  CodeMirrorHint,
  Button,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const calloutMessages = {
  CIRCULATION_RULES_UPDATE_SUCCESS: 'Rules were successfully updated.',
};

export default {
  defaultcirculationPolicy: {
    'rulesAsText': 'circulation policy'
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
    priority,
    priorityTypeName,
    loanPolicyName,
    overdueFinePolicyName,
    lostItemFeePolicyName,
    requestPolicyName,
    noticePolicyName
  }) {
    if (priorityTypeName) {
      priority ? this.fillInCirculationRules(priority) : this.fillInCirculationRules(' m ');
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
    cy.do(Button('Save').click());
  },
  checkUpdateCirculationRulesCalloutAppeared() {
    InteractorsTools.checkCalloutMessage(calloutMessages.CIRCULATION_RULES_UPDATE_SUCCESS);
  },
  checkNoticePolicyAddedToCirculationRules(noticePolicyId) {
    this.getApi().then((circulationRules) => {
      cy.expect(circulationRules.rulesAsText).to.include(`n ${noticePolicyId}`);
    });
  },
  createViaApi(newCirculatiuonPolicy) {
    cy.okapiRequest({
      method: 'POST',
      path: 'rules',
      body: newCirculatiuonPolicy
    })
  },
  getApi() {
    return cy.getCirculationRules();
  },
  updateApi(data) {
    return cy.updateCirculationRules(data);
  },
};
