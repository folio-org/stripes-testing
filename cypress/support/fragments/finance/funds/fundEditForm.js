import {
  Button,
  HTML,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  Selection,
  SelectionList,
  TextField,
  including,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import AddDonorsModal from '../modals/addDonorsModal';
import States from '../states';

const fundEditForm = Section({ id: 'pane-fund-form' });

const fundInfoSection = fundEditForm.find(Section({ id: 'information' }));
const donorInfoSection = fundEditForm.find(Section({ id: 'donorInformation' }));
const addDonorButton = donorInfoSection.find(Button({ id: 'fund.donorOrganizationIds-plugin' }));

const cancelButton = fundEditForm.find(Button('Cancel'));
const saveAndCloseButton = fundEditForm.find(Button('Save & close'));

const fundSections = {
  'Fund information': fundInfoSection,
  'Donor information': donorInfoSection,
};

const fundInfoSectionFields = {
  name: fundInfoSection.find(TextField({ name: 'fund.name' })),
  code: fundInfoSection.find(TextField({ name: 'fund.code' })),
  ledger: fundInfoSection.find(Selection({ name: 'fund.ledgerId' })),
  status: fundInfoSection.find(Selection({ name: 'fund.fundStatus' })),
  externalAccount: fundInfoSection.find(TextField({ name: 'fund.externalAccountNo' })),
};

const buttons = {
  'Add donor': addDonorButton,
  Cancel: cancelButton,
  'Save & close': saveAndCloseButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(fundEditForm.exists());
  },
  verifyFormView() {
    this.checkSectionsConditions([
      { sectionName: 'Fund information', conditions: { expanded: true } },
      { sectionName: 'Donor information', conditions: { expanded: false } },
    ]);
    this.checkButtonsConditions([
      { label: 'Cancel', conditions: { disabled: false } },
      { label: 'Save & close', conditions: { disabled: true } },
    ]);
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkSectionsConditions(sections = []) {
    sections.forEach(({ sectionName, conditions }) => {
      cy.expect(fundSections[sectionName].has(conditions));
    });
  },
  fillFundFields({ fundInfo, donorInfo }) {
    if (fundInfo) {
      this.fillFundInfoSectionFields(fundInfo);
    }
    if (donorInfo) {
      this.fillDonorInfoSectionFields(donorInfo);
    }
  },
  fillFundInfoSectionFields({ name, code, ledger, fundStatus, externalAccountNo }) {
    if (name) {
      cy.do(fundInfoSectionFields.name.fillIn(name));
    }
    if (code) {
      cy.do(fundInfoSectionFields.code.fillIn(code));
    }
    if (ledger) {
      cy.do(fundInfoSectionFields.ledger.choose(ledger));
    }
    if (fundStatus) {
      cy.do(fundInfoSectionFields.status.choose(fundStatus));
    }
    if (externalAccountNo) {
      cy.do(fundInfoSectionFields.externalAccount.fillIn(externalAccountNo));
    }
    cy.wait(2000);
  },
  fillDonorInfoSectionFields({ donorName, shouldExpand = true, clickSave = true }) {
    if (shouldExpand) {
      this.expandDonorInformationSection({ section: donorInfoSection });
    }
    this.clickAddDonnorsButton();

    AddDonorsModal.searchByName(donorName);
    AddDonorsModal.selectCheckboxFromResultsList([donorName]);

    if (clickSave) {
      AddDonorsModal.clickSaveButton();
    }
  },
  unassignDonorFromFund(donorName) {
    cy.do(
      donorInfoSection
        .find(MultiColumnListRow({ content: including(donorName), isContainer: true }))
        .find(Button({ ariaLabel: 'Unassign' }))
        .click(),
    );
  },
  expandDonorInformationSection() {
    this.clickSectionButton({ section: donorInfoSection });
  },
  checkDonorInformationSectionContent({ donors = [], hasViewPermissions = true } = {}) {
    donors.forEach((donor, index) => {
      cy.expect([
        donorInfoSection
          .find(MultiColumnListCell({ row: index, column: 'Name' }))
          .has({ content: including(donor.name), clickable: hasViewPermissions }),
        donorInfoSection
          .find(MultiColumnListCell({ row: index, column: 'Code' }))
          .has({ content: including(donor.code) }),
        donorInfoSection
          .find(MultiColumnListRow({ index }))
          .find(Button({ ariaLabel: 'Unassign' }))
          .exists(),
      ]);
    });

    if (!donors.length) {
      cy.expect(donorInfoSection.find(HTML(including('The list contains no items'))).exists());
    }
  },
  clickAddDonnorsButton() {
    cy.expect(addDonorButton.has({ disabled: false }));
    cy.do(addDonorButton.click());
    AddDonorsModal.verifyModalView();

    return AddDonorsModal;
  },
  clickSectionButton({ section }) {
    cy.do(section.toggle());
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(fundEditForm.absent());
  },
  clickSaveAndCloseButton({ fundSaved = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());

    if (fundSaved) {
      InteractorsTools.checkCalloutMessage(States.fundSavedSuccessfully);
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
