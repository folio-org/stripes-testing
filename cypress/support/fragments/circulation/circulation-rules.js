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
    priorityType, // 't ', 's ', 'c ', 'b ', 'a ', 'm ', 'g '
    loanPolicyName,
    overdueFinePolicyName,
    lostItemFeePolicyName,
    requestPolicyName,
    noticePolicyName,
    priorityTypeName // materialTypeName, patronGroupName...
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
    }).then(req => {
      return req.body;
    });
  },
  getApi() {
    return cy.getCirculationRules();
  },
  updateApi(data) {
    return cy.updateCirculationRules(data);
  },
  addNewRuleApi(priorityId, noticeId) {
    // TODO add supporting for more options
    const priority = '\ng ';
    let defaultRules;

    this.getApi().then((rulesAsText) => { defaultRules = rulesAsText.rulesAsText; }).then(() => {
      // deault parameters addresses in string
      // defaultRules.substring(286, 322),
      // defaultRules.substring(325, 361),
      // defaultRules.substring(364, 400),
      // defaultRules.substring(403, 438)
      const withNewRule = defaultRules + priority + priorityId + defaultRules.substring(281, 440) + 'n ' + noticeId;
      cy.updateCirculationRules({ rulesAsText: withNewRule });
    }).then(() => {
      // TODO: fix - cannot get value from return
      Cypress.env('defaultRules', defaultRules);
    });
  },
  deleteAddedRuleApi(defaultRules) {
    return cy.updateCirculationRules({ rulesAsText: defaultRules });
  }
};
