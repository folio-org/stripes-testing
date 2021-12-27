import { Section, Pane, HTML, including, Button, Label, KeyValue } from '../../../../interactors';
import eHoldingResourceEdit from './eHoldingResourceEdit';
import { getLongDelay } from '../../utils/cypressTools';

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
  },
  goToEdit:() => {
    return cy.then(() => Pane().id())
      .then(resourceId => {
        cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
        cy.do(Button('Edit').click());
        eHoldingResourceEdit.waitLoading();
      });
  },
  checkCustomPeriods:(expectedPeriods) => {
    let expectedRangesString = '';
    const separator = ', ';
    expectedPeriods.forEach(period => {
      expectedRangesString += `${period.startDay} - ${period.endDay}${separator}`;
    });
    cy.expect(KeyValue('Custom coverage dates', { value:  expectedRangesString.slice(0, -separator.length) }).exists());
  }
};
