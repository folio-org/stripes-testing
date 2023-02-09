import { Pane, NavListItem, Button, TextField, Checkbox, Accordion, MultiColumnListHeader, MultiColumnListCell, Modal } from "../../../../../interactors";
import { including } from 'bigtest';

const fieldMappingProfilesPane = Pane('Field mapping profiles');
const instanceRecordTypeChechbox = Checkbox({ value: 'INSTANCE', name: 'filters.recordTypes' });
const holdingsRecordTypeChechbox = Checkbox({ value: 'HOLDINGS', name: 'filters.recordTypes' });
const itemRecordTypeChechbox = Checkbox({ value: 'ITEM', name: 'filters.recordTypes' });
const selectedStatusChechbox = Checkbox({ value: 'selected' });
const unSelectedStatusChechbox = Checkbox({ value: 'unselected' });
const transformationsSearchTextfield = TextField({ name: 'searchValue' });
const resetAllButton = Button('Reset all');
const transformationsSaveAndCloseButton = Modal('Select transformations').find(Button('Save & close'));
const newFieldMappingProfileSaveAndCloseButton = Pane('New field mapping profile').find(Button('Save & close'));

export default {
    getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col }),
    clickNthCheckbox(checkBoxNumber = 1) {
        // Couldn't get the element with interactors
        cy.get(`div[class^="mclRow--"]:nth-child(${checkBoxNumber}) input[type="checkbox"]`).click();
    },
    verifySearchResultIncludes(allContentToCheck) {
        return allContentToCheck.forEach(contentToCheck => cy.expect(Pane('Transformations').find(MultiColumnListCell({ content: including(contentToCheck) })).exists()));
    },
    verifySearchResultDoesNotInclude(allContentToCheck) {
        return allContentToCheck.forEach(contentToCheck => cy.expect(Pane('Transformations').find(MultiColumnListCell({ content: including(contentToCheck) })).absent()));
    },
    goTofieldMappingProfilesTab() {
        cy.do(NavListItem('Data export').click());
        cy.expect(Pane('Data export').exists());
        cy.do(NavListItem('Field mapping profiles').click());
        cy.expect(fieldMappingProfilesPane.exists());
    },
    createNewFieldMappingProfile(name, recordType) {
        cy.do([
            Button('New').click(),
            TextField('Name*').fillIn(name),
            Checkbox(recordType).click(),
            Accordion('Transformations').find(Button('Add transformations')).click(),
        ])
    },
    verifyAllSearchAndFilterCheckboxesChecked() {
        cy.expect([
            instanceRecordTypeChechbox.has({ checked: true }),
            holdingsRecordTypeChechbox.has({ checked: true }),
            itemRecordTypeChechbox.has({ checked: true }),
            selectedStatusChechbox.has({ checked: true }),
            unSelectedStatusChechbox.has({ checked: true }),
        ])
    },
    verifyTransformationsPaneColumns() {
        cy.expect([
            Checkbox({ id: 'select-all-checkbox', checked: false }).exists(),
            MultiColumnListHeader('Field name').exists(),
            MultiColumnListHeader('Transformation').exists(),
        ])
    },
    verifySearchAndFilterPane() {
        this.verifyAllSearchAndFilterCheckboxesChecked();
        this.verifyTransformationsPaneColumns();
    },
    searchText(text) {
        cy.do(transformationsSearchTextfield.fillIn(text));
        cy.get('input[name="searchValue"]').type('{enter}');
    },
    clickResetAll() {
        cy.do(resetAllButton.click());
    },
    uncheckInstanceRecordTypeChechbox() {
        cy.expect(instanceRecordTypeChechbox.has({ checked: true }));
        cy.do(instanceRecordTypeChechbox.click());
    },
    uncheckHoldingsRecordTypeChechbox() {
        cy.expect(holdingsRecordTypeChechbox.has({ checked: true }));
        cy.do(holdingsRecordTypeChechbox.click());
    },
    uncheckItemRecordTypeChechbox() {
        cy.expect(itemRecordTypeChechbox.has({ checked: true }));
        cy.do(itemRecordTypeChechbox.click());
    },
    uncheckSelectedStatusChechbox() {
        cy.expect(selectedStatusChechbox.has({ checked: true }));
        cy.do(selectedStatusChechbox.click());
    },
    uncheckUnselectedStatusChechbox() {
        cy.expect(unSelectedStatusChechbox.has({ checked: true }));
        cy.do(unSelectedStatusChechbox.click());
    },
    checkInstanceRecordTypeChechbox() {
        cy.expect(instanceRecordTypeChechbox.has({ checked: false }));
        cy.do(instanceRecordTypeChechbox.click());
    },
    checkHoldingsRecordTypeChechbox() {
        cy.expect(holdingsRecordTypeChechbox.has({ checked: false }));
        cy.do(holdingsRecordTypeChechbox.click());
    },
    checkItemRecordTypeChechbox() {
        cy.expect(itemRecordTypeChechbox.has({ checked: false }));
        cy.do(itemRecordTypeChechbox.click());
    },
    checkSelectedStatusChechbox() {
        cy.expect(selectedStatusChechbox.has({ checked: false }));
        cy.do(selectedStatusChechbox.click());
    },
    checkUnselectedStatusChechbox() {
        cy.expect(unSelectedStatusChechbox.has({ checked: false }));
        cy.do(unSelectedStatusChechbox.click());
    },
    verifyTotalSelected(expectedTotalSelected) {
        cy.expect(Modal('Select transformations').has({ content: including(`Total selected: ${expectedTotalSelected}`) }));
    },
    fillInTransformationsTextfields(textfield1, textfield2, textfield3, textfield4, rowIndex = 0) {
        // Couldn't get the element with interactors
        cy.xpath(`//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "marcField")]`).type(textfield1);
        cy.xpath(`//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "indicator1")]`).type(textfield2);
        cy.xpath(`//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "indicator2")]`).type(textfield3);
        cy.xpath(`//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "subfield")]`).type(textfield4);
    },
    clickTransformationsSaveAndCloseButton() {
        cy.do(transformationsSaveAndCloseButton.click());
    },
    clickNewFieldMappingProfileSaveAndCloseButton() {
        cy.do(newFieldMappingProfileSaveAndCloseButton.click());
    },
};
