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
    priorityTypeName, // this is the name of priorityType, for example for <g>: <patron_group_name>:
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
  // createViaApi(newCirculatiuonPolicy) {
  //   cy.okapiRequest({
  //     method: 'POST',
  //     path: 'rules',
  //     body: newCirculatiuonPolicy
  //   }).then(req => {
  //     return req.body;
  //   });
  // },
  getApi() {
    return cy.getCirculationRules();
  },
  updateApi(data) {
    return cy.updateCirculationRules(data);
  },

  // createViaApi(() =)
  addNewRuleApi(defaultRules, priorityId, noticeId) {
    // TODO add supporting for more options
    const priority = '\ng ';
    const oIndex = defaultRules.indexOf(' o ', 2);
    const iIndex = defaultRules.indexOf(' i ', 2);
    const lIndex = defaultRules.indexOf(' l ', 2);
    const rIndex = defaultRules.indexOf(' r ', 2);
    const o = defaultRules.substring(oIndex, oIndex + 39);
    const l = defaultRules.substring(lIndex, lIndex + 39);
    const i = defaultRules.substring(iIndex, iIndex + 39);
    const r = defaultRules.substring(rIndex, rIndex + 39);
    const withNewRule = defaultRules + priority + priorityId + ' : ' + i + l + r + o + ' n ' + noticeId;

    // return new Promise(rslv => setTimeout(rslv, 1000));

    // const body = { 'govno': 'poest' };

    const body = { rulesAsText: withNewRule };
    console.warn('ABBBBBBBBAAA 1', body)
    const resp = cy.updateCirculationRules(body);

    console.warn('ABBBBBBBBAAA 2', resp)

    return resp;
  },
  deleteAddedRuleApi(defaultRules) {
    const body = { rulesAsText: defaultRules };

    console.log('ETO SRAN 1', body)

    const resp = cy.updateCirculationRules({ rulesAsText: defaultRules });

    console.log('ETO SRAN 2', resp)

    return resp
  }
};
