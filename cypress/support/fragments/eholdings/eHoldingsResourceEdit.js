import {
  TextField,
  Button,
  RadioButton,
  Accordion,
  TextArea,
  Select,
  KeyValue,
  HTML,
  including,
} from '../../../../interactors';

const addNewRange = () => {
  cy.do(Button('Add date range').click());
};
const saveAndClose = () => {
  cy.do(Button('Save & close').click());
};

const customCoveredDatesRadioButton = RadioButton(
  'Custom coverage dates (enter multiple date ranges in descending order)',
);
const coverageStatementRadioButton = RadioButton('Coverage statement');
const coverageStatementTextArea = TextArea({ name: 'coverageStatement' });

const customLabelsAccordion = Accordion('Custom labels');
const customLabelInput = (label) => customLabelsAccordion.find(TextField({ label }));
const customEmbargoValueField = TextField({ name: 'customEmbargoPeriod[0].embargoValue' });
const customEmbargoUnitSelect = Select({ name: 'customEmbargoPeriod[0].embargoUnit' });
const saveButton = Button('Save & close');
const proxySelect = Select({ name: 'proxyId' });
const addCustomEmbargoPeriodButton = Button('Add custom embargo period');
const removeCustomEmbargoButton = Button({ icon: 'trash', ariaLabel: 'Clear embargo period' });
const proxiedURLKeyValue = KeyValue('Proxied URL');
const customUrlField = TextField('Custom URL');

export default {
  // TODO: redesign to interactors after clarification of differences between edit and view pages
  waitLoading: () => {
    cy.get(
      'div[id=eholdings-module-display]>form section[class*=pane][aria-labelledby*=details-view-pane-title]',
    ).should('be.visible');
  },

  addNewRange,

  setCustomCoverageDates: (range, rangeNumber = 1) => {
    if (rangeNumber > 0) {
      addNewRange();
    }
    cy.do(TextField('Start date', { id: `begin-coverage-${rangeNumber}` }).fillIn(range.startDay));
    cy.do(TextField('End date', { id: `end-coverage-${rangeNumber}` }).fillIn(range.endDay));
  },
  saveAndClose,
  swicthToCustomCoverageDates: () => {
    cy.do(customCoveredDatesRadioButton.click());
  },
  removeExistingCustomeCoverageDates: () => {
    cy.do(RadioButton('Managed coverage dates').click());
    saveAndClose();
  },
  fillCustomLabelValue(labelName, value) {
    cy.do(customLabelInput(labelName).fillIn(value));
  },

  chooseCoverageStatement() {
    cy.do(coverageStatementRadioButton.click());
  },

  fillCoverageStatement(statement) {
    cy.do(coverageStatementTextArea.fillIn(statement));
  },

  fillCustomEmbargo(value, unit) {
    cy.wait(500);
    cy.do([customEmbargoValueField.fillIn(value), customEmbargoUnitSelect.choose(unit)]);
  },

  addCustomEmbargo() {
    cy.do(addCustomEmbargoPeriodButton.click());
  },

  removeCustomEmbargo() {
    cy.do(removeCustomEmbargoButton.click());
  },

  verifyCustomEmbargoRemovalMessage() {
    cy.contains('Nothing set. Saving will remove custom embargo period.').should('be.visible');
  },

  verifySaveButtonEnabled() {
    cy.expect(saveButton.has({ disabled: false }));
  },

  changeProxy: () => {
    return cy
      .then(() => proxySelect.checkedOptionText())
      .then((selectedProxy) => {
        cy.getEholdingsProxiesViaAPI().then((existingProxies) => {
          const notSelectedProxy = existingProxies.filter(
            (existingProxy) => existingProxy !== selectedProxy,
          )[0];
          cy.do(proxySelect.choose(notSelectedProxy));
          cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
          return cy.wrap(notSelectedProxy);
        });
      });
  },

  verifyProxiedURLNotDisplayed() {
    cy.expect(proxiedURLKeyValue.absent());
  },

  fillInCustomUrl(customUrl) {
    cy.do(customUrlField.fillIn(customUrl));
  },

  verifyCustomUrlFilled(customUrl) {
    cy.expect(customUrlField.has({ value: customUrl }));
  },

  removeCustomEmbargoViaAPI(resourceId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `eholdings/resources/${resourceId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        const resourceData = response.body.data;

        return cy.okapiRequest({
          method: 'PUT',
          path: `eholdings/resources/${resourceId}`,
          contentTypeHeader: 'application/vnd.api+json',
          body: {
            data: {
              id: resourceId,
              type: 'resources',
              attributes: {
                ...resourceData.attributes,
                customEmbargoPeriod: null,
              },
            },
          },
          isDefaultSearchParamsRequired: false,
        });
      });
  },

  addCustomEmbargoViaAPI(resourceId, { embargoValue, embargoUnit }) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `eholdings/resources/${resourceId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        const resourceData = response.body.data;

        return cy.okapiRequest({
          method: 'PUT',
          path: `eholdings/resources/${resourceId}`,
          contentTypeHeader: 'application/vnd.api+json',
          body: {
            data: {
              id: resourceId,
              type: 'resources',
              attributes: {
                ...resourceData.attributes,
                customEmbargoPeriod: {
                  embargoUnit,
                  embargoValue: parseInt(embargoValue, 10),
                },
              },
            },
          },
          isDefaultSearchParamsRequired: false,
        });
      });
  },
};
