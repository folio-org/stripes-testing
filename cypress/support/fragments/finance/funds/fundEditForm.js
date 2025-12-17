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
  MultiColumnList,
  Modal,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import AddDonorsModal from '../modals/addDonorsModal';
import States from '../states';

const fundEditForm = Section({ id: 'pane-fund-form' });

const fundInfoSection = fundEditForm.find(Section({ id: 'information' }));
const donorInfoSection = fundEditForm.find(Section({ id: 'donorInformation' }));
const addDonorButton = donorInfoSection.find(Button({ id: 'fund.donorOrganizationIds-plugin' }));
const donorsList = MultiColumnList({ id: 'fund.donorOrganizationIds' });

const cancelButton = fundEditForm.find(Button('Cancel'));
const saveAndCloseButton = Button('Save & close');

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
  verifyDonorModal() {
    const modal = '[data-test-find-records-modal="true"]';

    cy.get(modal).should('be.visible');
    cy.get(`${modal} h1[data-test-headline="true"]`).should('have.text', 'Add donors');
    cy.get(`${modal} [data-test-filter-pane="true"]`).within(() => {
      cy.get('[data-test-pane-header-title="true"]').should('contain.text', 'Search & filter');
      cy.get('#input-record-search').should('have.value', '');
      cy.get('[data-test-single-search-form-submit="true"]').should('be.disabled');
      cy.get('#reset-find-records-filters').should('exist');

      cy.get('#accordion-toggle-button-org-filter-organizationTypes').should(
        'have.attr',
        'aria-expanded',
        'false',
      );
      cy.get('#accordion-toggle-button-tags').should('have.attr', 'aria-expanded', 'false');
      cy.get('#accordion-toggle-button-isVendor').should('have.attr', 'aria-expanded', 'false');
    });

    cy.get(`${modal} [data-test-results-pane="true"]`).within(() => {
      cy.get('[data-test-pane-header-title="true"]').should('contain.text', 'Donors');
      cy.get('[data-test-pane-header-sub="true"]').should('contain.text', 'records found');
      cy.get('[data-test-find-records-modal-select-all="true"]').should('not.be.checked');
      cy.get('#list-plugin-find-records').should('have.attr', 'role', 'grid');

      cy.get('[data-testid="prev-page-button"]').should('be.disabled');
      cy.get('[data-testid="prev-page-button"]')
        .parent()
        .invoke('text')
        .should((t) => expect(t.trim()).to.match(/1\s*-\s*\d+/));
      cy.get('[data-testid="next-page-button"]').should('be.enabled');
    });
  },
  clickDonorNameByRow(rowIndex) {
    cy.wait(4000);
    cy.expect(donorsList.exists());
    cy.do(
      donorsList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Name' }))
        .perform((cell) => {
          const link = cell.querySelector('[data-test-text-link], a');
          link.click();
        }),
    );
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
    cy.wait(4000);

    if (fundSaved) {
      InteractorsTools.checkCalloutMessage(States.fundSavedSuccessfully);
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
  keepEditingFund: () => {
    cy.wait(3000);
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-confirm' }))
        .click(),
    );
  },
  changeStatusAndCancelWithoutSaving: (newStatus) => {
    cy.wait(2000);
    cy.do([
      Selection(including('Status*')).open(),
      SelectionList().filter(newStatus),
      SelectionList().select(including(newStatus)),
    ]);
    cy.wait(2000);
    cy.do([Button('Cancel').click(), Button('Close without saving').click()]);
  },
};
