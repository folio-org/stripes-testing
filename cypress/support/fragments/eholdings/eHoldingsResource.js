import { Section, Pane, HTML, including, Button, Label } from '../../../../interactors';

const holdingStatusSection = Section({ id: 'resourceShowHoldingStatus' });

export default {
  waitLoading: () => {
    cy.expect(holdingStatusSection.exists());
  },
  checkNames: (packageName, titleName) => {
    const resourceId = titleName.replaceAll(' ', '-').toLowerCase();
    cy.expect(Pane({ title:titleName }).exists());
    cy.expect(Section({ id:resourceId })
      .find(HTML(including(packageName, { class: 'headline' }))).exists());
    cy.expect(Section({ id:resourceId })
      .find(HTML(including(titleName, { class: 'headline' }))).exists());
  },
  addToHoldings:() => {
    cy.do(holdingStatusSection.find(Button('Add to holdings')).click());
    cy.expect(holdingStatusSection.find(
      Label({ for: 'resource-show-toggle-switch' },
        including('Selected'))
    ).exists());
  }
};
