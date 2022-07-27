import { Section, Pane, HTML, including, Button, Label, KeyValue, Modal } from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import eHoldingResourceEdit from './eHoldingResourceEdit';

const holdingStatusSection = Section({ id: 'resourceShowHoldingStatus' });
const addToHoldingButton = holdingStatusSection.find(Button('Add to holdings'));

const checkHoldingStatus = (holdingStatus) => {
  cy.expect(holdingStatusSection.find(
    Label({ for: 'resource-show-toggle-switch' },
      including(holdingStatus))
  ).exists());
};

const openActionsMenu = () => {
  cy.then(() => Pane().id())
    .then(resourceId => {
      cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
    });
};

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
  checkActions: (resourceId) => {
    // waiting for button to be available to recieve click
    cy.wait(1000);
    cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
    cy.expect(Button('Edit').exists());
    cy.expect(Button('Remove title from holdings').exists());
  },
  addToHoldings:() => {
    cy.do(addToHoldingButton.click());
  },
  goToEdit:() => {
    openActionsMenu();
    cy.do(Button('Edit').click());
    eHoldingResourceEdit.waitLoading();
  },
  checkCustomPeriods:(expectedPeriods) => {
    let expectedRangesString = '';
    const separator = ', ';
    expectedPeriods.forEach(period => {
      expectedRangesString += `${period.startDay} - ${period.endDay}${separator}`;
    });
    // TODO: update ater fix of https://issues.folio.org/browse/UIEH-1227
    expectedRangesString = dateTools.clearPaddingZero(expectedRangesString);
    cy.expect(KeyValue('Custom coverage dates', { value:  expectedRangesString.slice(0, -separator.length) }).exists());
  },
  checkHoldingStatus,
  removeTitleFromHolding: () => {
    cy.then(() => Pane().id())
      .then(resourceId => {
        cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
        cy.do(Button('Remove title from holdings').click());
      });
    const confirmationModal = Modal({ id:'eholdings-resource-deselection-confirmation-modal' });

    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(Button('Yes, remove')).click());
    cy.expect(confirmationModal.absent());
    cy.expect(addToHoldingButton.exists());
    openActionsMenu();
    cy.expect(Button('Add to holdings').exists());
  }
};
