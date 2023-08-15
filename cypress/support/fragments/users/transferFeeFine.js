import { el } from 'date-fns/locale';
import {
  Button,
  Modal,
  TextField,
  Select,
  Pane,
  MultiSelect,
} from '../../../../interactors';

const rootModal = Modal({ id: 'transfer-modal' });
const amountTextfield = rootModal.find(TextField({ id: 'amount' }));
const ownerSelect = rootModal.find(Select({ id: 'ownerId' }));
const transferAccountSelect = rootModal.find(Select({ name: 'method' }));
const transferButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmModal = Modal('Confirm fee/fine transfer');
const confirmButton = confirmModal.find(Button('Confirm'));
const transferPane = Pane('Transfer configuration');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  waitLoadingTransferCriteria() {
    cy.expect(transferPane.exists());
  },

  setTransferCriteriaScheduling(frequency, interval, time, weekDays) {
    cy.do(Select({ name: 'scheduling.frequency' }).choose(frequency));

    if (frequency === 'Weeks') {
      cy.do([TextField({ name: 'scheduling.time' }).fillIn(time)]);
      cy.do([TextField({ name: 'scheduling.interval' }).fillIn(interval)]);
    } else if (frequency === 'Days') {
      cy.do([Select({ name: 'scheduling.interval' }).choose(interval)]);
    }
  },

  setAggregateByPatron(aggregate) {
    if (!aggregate) {
      cy.get('input[name="aggregate"]').uncheck({ force: true });
    }
    // Currently don't have any test cases for aggregate by patron
  },

  runManually() {
    cy.do([Button({ text: 'Run manually' }).click()]);
  },

  typeScheduleTime(time) {
    // time: string like 9:15 AM
    cy.do([
      TextField({ name: 'scheduleTime' }).fillIn(time),
      Button({ icon: 'clock' }).click(),
      Button('Set time').click(),
    ]);
  },

  verifyScheduleTime(time) {
    cy.expect(TextField({ name: 'scheduleTime', value: time }).exists());
  },

  setCriteria(criteria) {
    if (!criteria) {
      cy.do(
        Select({ name: 'criteria.type' }).choose('No criteria (always run)')
      );
    }
    // Currently don't have any test cases for criteria
  },

  setTransferAccount(feeFineOwner, transferAccount) {
    cy.do([
      Select({ name: 'transferInfo.else.owner' }).choose(feeFineOwner),
      Select({ name: 'transferInfo.else.account' }).choose(transferAccount),
    ]);
  },

  openAllPanes() {
    if (!Button({ text: 'Collapse all' }).exists()) {
      cy.do([Button({ text: 'Expand all' }).click()]);
    }
  },

  clearFormat(format) {
    let sectionName = '';
    if (format === 'header') {
      sectionName = 'section[id="accordion_10"]';
    } else if (format === 'data') {
      sectionName = 'section[id="accordion_11"]';
    } else {
      sectionName = 'section[id="accordion_12"]';
    }

    // if section is empty, skip
    cy.get(sectionName).then(($section) => {
      if ($section.find('button[icon="trash"]').length !== 0) {
        cy.get(sectionName).within(() => {
          cy.get('button[icon="trash"]').then(($btn) => {
            for (let i = 0; i < $btn.length; i++) {
              cy.get('button[icon="trash"]').eq(0).click();
            }
          });
        });
      }
    });
  },

  verifyClearFormat(format) {
    let sectionName = '';
    if (format === 'header') {
      sectionName = 'section[id="accordion_10"]';
    } else if (format === 'data') {
      sectionName = 'section[id="accordion_11"]';
    } else {
      sectionName = 'section[id="accordion_12"]';
    }

    cy.get(sectionName).then(($section) => {
      cy.expect($section.find('button[icon="trash"]').length).to.equal(0);
    });
  },

  verifyOpenAllPanes() {
    cy.expect(Button({ text: 'Collapse all' }).exists());
  },

  verifyTransferCriteriaScheduling(frequency, interval, time, weekDays) {
    cy.expect(
      Select({ name: 'scheduling.frequency', value: frequency }).exists()
    );
    if (frequency === 'WEEK') {
      cy.expect(TextField({ name: 'scheduling.time', value: time }).exists());
      cy.expect(
        TextField({ name: 'scheduling.interval', value: interval }).exists()
      );
    }
  },

  verifyCriteria(criteria) {
    if (!criteria) {
      cy.expect(Select({ name: 'criteria.type', value: 'Pass' }).exists());
    }
  },

  verifyTransferAccount(feeFineOwner, transferAccount) {
    cy.expect(
      Select({ name: 'transferInfo.else.owner', value: feeFineOwner }).exists()
    );
    cy.expect(
      Select({
        name: 'transferInfo.else.account',
        value: transferAccount,
      }).exists()
    );
  },

  verifyRunManually() {
    cy.on('window:alert', (str) => {
      expect(str).to.equal('Job has been scheduled');
    });
  },

  verifyAggregateByPatron(aggregate) {
    if (!aggregate) {
      cy.get('input[name="aggregate"]').should('not.be.checked');
    }
  },
};
