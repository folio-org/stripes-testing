import { NavListItem, Pane } from '../../../../interactors';

const oaipmhPane = Pane('OAI-PMH');
const generalListItem = NavListItem('General');
const technicalListItem = NavListItem('Technical');
const behaviorListItem = NavListItem('Behavior');

export default {
  waitLoading() {
    cy.expect(oaipmhPane.exists());
  },

  verifyPaneElements() {
    cy.expect([
      oaipmhPane.exists(),
      oaipmhPane.find(generalListItem).exists(),
      oaipmhPane.find(technicalListItem).exists(),
      oaipmhPane.find(behaviorListItem).exists(),
    ]);
  },

  clickBehaviorItem() {
    cy.do(behaviorListItem.click());
  },
};
