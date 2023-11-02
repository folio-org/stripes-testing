import {
  Section,
  Pane,
  HTML,
  including,
  Button,
  Label,
  KeyValue,
  Modal,
  Accordion,
  RadioButton,
} from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import eHoldingResourceEdit from './eHoldingResourceEdit';

const actionsButton = Button('Actions');
const holdingStatusSection = Section({ id: 'resourceShowHoldingStatus' });
const addToHoldingButton = holdingStatusSection.find(Button('Add to holdings'));
const exportButton = Button('Export title package (CSV)');
const exportModal = Modal('Export settings');
const exportButtonInModal = exportModal.find(Button('Export'));
const cancelButtonInModal = exportModal.find(Button('Cancel'));
const selectedPackageFieldsRadioButton = RadioButton({
  name: 'packageFields',
  ariaLabel: 'Export selected fields',
});
const selectedTitleFieldsRadioButton = RadioButton({
  name: 'titleFields',
  ariaLabel: 'Export selected fields',
});

const checkHoldingStatus = (holdingStatus) => {
  cy.expect(
    holdingStatusSection
      .find(Label({ for: 'resource-show-toggle-switch' }, including(holdingStatus)))
      .exists(),
  );
};

const openActionsMenu = () => {
  cy.then(() => Pane().id()).then((resourceId) => {
    cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
  });
};

const customLabelsAccordion = Accordion('Custom labels');
const customLabelValue = (label) => customLabelsAccordion.find(KeyValue(label));

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
    eHoldingResourceEdit.waitLoading();
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

  openExportModal() {
    cy.do([actionsButton.click(), exportButton.click()]);
    cy.expect(exportModal.exists());
  },
  closeExportModalViaCancel() {
    cy.do(cancelButtonInModal.click());
    cy.expect(exportModal.absent());
    this.waitLoading();
  },
  verifyExportModalInPackageTile: () => {
    const modalContent =
      'This export may take several minutes to complete. When finished, it will be available in the Export manager app. NOTE: This export does not include information available under Usage & analysis accordion (only available to Usage Consolidation subscribers). Please use the Export titles option available under that accordion.';

    cy.expect(exportModal.find(HTML(including(modalContent))).exists());
    cy.expect(exportModal.find(Label('Package fields to export')).exists());
    cy.expect(exportModal.find(Label('Title fields to export')).exists());
    cy.expect(exportModal.find(selectedPackageFieldsRadioButton).exists());
    cy.expect(exportModal.find(selectedTitleFieldsRadioButton).exists());
    cy.expect(cancelButtonInModal.has({ disabled: false }));
    cy.expect(exportButtonInModal.has({ disabled: false }));
  },
  verifyPackagesResourceExportedFileName(actualName) {
    expect(actualName).to.match(
      /^cypress\/downloads\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_\d+-\d+-\d+_resource\.csv$/,
    );
  },
};
