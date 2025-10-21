import {
  Section,
  Pane,
  HTML,
  including,
  Button,
  KeyValue,
  Modal,
  Accordion,
  MultiColumnListCell,
  Link,
} from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import EHoldingsResourceEdit from './eHoldingsResourceEdit';
import ExportSettingsModal from './modals/exportSettingsModal';
import SelectAgreementModal from './modals/selectAgreementModal';

const closeViewButton = Button({ dataTestID: 'close-details-view-button' });
const actionsButton = Button('Actions');
const holdingStatusSection = Section({ id: 'resourceShowHoldingStatus' });
const agreementsSection = Section({ id: 'resourceShowAgreements' });
const addToHoldingButton = holdingStatusSection.find(Button('Add to holdings'));
const exportButton = Button('Export title package (CSV)');

const checkHoldingStatus = (holdingStatus) => {
  cy.expect(holdingStatusSection.find(HTML(including(holdingStatus))).exists());
};

const openActionsMenu = () => {
  cy.then(() => Pane().id()).then((resourceId) => {
    cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
  });
};

const customLabelsAccordion = Accordion('Custom labels');
const customLabelValue = (label) => customLabelsAccordion.find(KeyValue(label));
const resourceSettingsAccordion = Accordion('Resource settings');
const resourceSettingsAccordionButton = Button({
  id: 'accordion-toggle-button-resourceShowSettings',
});
const customCoverageDatesKeyValue = KeyValue('Custom coverage dates');
const customCoverageStatementKeyValue = KeyValue('Custom coverage statement');
const customEmbargoPeriodKeyValue = KeyValue('Custom embargo period');
const showToPatronsKeyValue = KeyValue('Show to patrons');
const proxyKeyValue = KeyValue('Proxy');
const proxiedURLKeyValue = KeyValue('Proxied URL');

export default {
  waitLoading: () => {
    cy.expect(holdingStatusSection.exists());
  },
  checkNames: (packageName, titleName) => {
    const resourceId = titleName.replaceAll(' ', '-').toLowerCase();
    cy.expect(Pane({ title: titleName }).exists());
    cy.expect(
      Section({ id: resourceId })
        .find(HTML(including(packageName, { class: 'headline' })))
        .exists(),
    );
    cy.expect(
      Section({ id: resourceId })
        .find(HTML(including(titleName, { class: 'headline' })))
        .exists(),
    );
  },
  addToHoldings: () => {
    cy.do(addToHoldingButton.click());
  },
  goToEdit: () => {
    openActionsMenu();
    cy.do(Button('Edit').click());
    EHoldingsResourceEdit.waitLoading();
  },
  checkCustomPeriods: (expectedPeriods) => {
    let expectedRangesString = '';
    const separator = ', ';
    expectedPeriods.forEach((period) => {
      expectedRangesString += `${period.startDay} - ${period.endDay}${separator}`;
    });
    // TODO: update ater fix of https://issues.folio.org/browse/UIEH-1227
    expectedRangesString = dateTools.clearPaddingZero(expectedRangesString);
    cy.expect(
      KeyValue('Custom coverage dates', {
        value: expectedRangesString.slice(0, -separator.length),
      }).exists(),
    );
  },
  checkHoldingStatus,
  removeTitleFromHolding: () => {
    cy.then(() => Pane().id()).then((resourceId) => {
      cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
      cy.do(Button('Remove title from holdings').click());
    });
    const confirmationModal = Modal({ id: 'eholdings-resource-deselection-confirmation-modal' });

    cy.expect(confirmationModal.exists());
    cy.do(confirmationModal.find(Button('Yes, remove')).click());
    cy.expect(confirmationModal.absent());
    cy.expect(addToHoldingButton.exists());
    openActionsMenu();
    cy.expect(Button('Add to holdings').exists());
  },
  verifyCustomLabelValue(labelName, value = 'No value set-') {
    this.waitLoading();
    cy.expect(customLabelValue(labelName).has({ value }));
  },
  getResourceDetails() {
    cy.get('[data-test-eholdings-detail-pane-contents="true"]').then(($details) => {
      const title = $details[0].querySelector(
        '[data-testid="details-view-name-heading"]',
      ).textContent;
      const sub = $details[0].querySelector(
        '[data-testid="details-view-panesub-headline"]',
      ).textContent;

      cy.wrap({ title, sub }).as('recourceDetails');
    });
    return cy.get('@recourceDetails');
  },
  openExportModal({ exportDisabled = false } = {}) {
    cy.do([actionsButton.click(), exportButton.click()]);
    ExportSettingsModal.verifyModalView({ exportDisabled, packageView: false });

    return ExportSettingsModal;
  },
  verifyPackagesResourceExportedFileName(actualName) {
    expect(actualName).to.match(
      /^cypress\/downloads\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_\d+-\d+-\d+_resource\.csv$/,
    );
  },
  openSelectAgreementModal() {
    cy.do(agreementsSection.find(Button('Add')).click());
    SelectAgreementModal.waitLoading();
    SelectAgreementModal.verifyModalView();

    return SelectAgreementModal;
  },
  checkAgreementsTableContent({ records = [] }) {
    records.forEach((record, index) => {
      if (record.date) {
        cy.expect(
          agreementsSection
            .find(MultiColumnListCell({ row: index, column: 'Start Date' }))
            .has({ content: including(record.date) }),
        );
      }
      if (record.status) {
        cy.expect(
          agreementsSection
            .find(MultiColumnListCell({ row: index, column: 'Status' }))
            .has({ content: including(record.status) }),
        );
      }
      if (record.name) {
        cy.expect(
          agreementsSection
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(record.name) }),
        );
      }
    });
  },
  closeHoldingsResourceView() {
    cy.do(closeViewButton.click());
  },

  verifyNoCustomCoverageDates() {
    cy.expect(customCoverageDatesKeyValue.absent());
  },

  verifyCoverageStatement(statement) {
    cy.expect(customCoverageStatementKeyValue.has({ value: statement }));
  },

  verifyCustomEmbargoExists() {
    cy.expect(customEmbargoPeriodKeyValue.exists());
  },

  verifyCustomEmbargoValue(value, unit) {
    const formattedUnit = unit.toLowerCase().replace(/s$/, '(s)');
    cy.expect(customEmbargoPeriodKeyValue.has({ value: including(`${value} ${formattedUnit}`) }));
  },

  expandResourceSettingsAccordion() {
    cy.wait(500);
    cy.then(() => resourceSettingsAccordionButton.ariaExpanded()).then((isExpanded) => {
      if (isExpanded === 'false') {
        cy.do(resourceSettingsAccordion.click());
        cy.wait(1000);
      }
    });
  },

  verifyCustomEmbargoAbsent() {
    cy.expect(customEmbargoPeriodKeyValue.absent());
  },

  verifyResourceSettingsAccordion() {
    this.expandResourceSettingsAccordion();
    cy.expect(resourceSettingsAccordion.exists());
    cy.expect(showToPatronsKeyValue.exists());
    cy.expect(proxyKeyValue.exists());
  },

  verifyProxy(proxyName) {
    this.expandResourceSettingsAccordion();
    if (proxyName) {
      cy.expect(proxyKeyValue.has({ value: proxyName }));
    } else {
      cy.expect(proxyKeyValue.exists());
    }
  },

  verifyProxiedURL() {
    this.expandResourceSettingsAccordion();
    cy.expect(proxiedURLKeyValue.exists());
  },

  verifyProxiedURLNotDisplayed() {
    this.expandResourceSettingsAccordion();
    cy.expect(proxiedURLKeyValue.absent());
  },

  verifyProxiedURLLink() {
    this.expandResourceSettingsAccordion();
    cy.then(() => proxiedURLKeyValue.value()).then((url) => {
      const trimmedUrl = url.trim();
      cy.expect(resourceSettingsAccordion.find(Link({ href: including(trimmedUrl) })).exists());
    });
  },
};
