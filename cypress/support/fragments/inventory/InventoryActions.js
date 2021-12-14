import { Button, Select, TextField } from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';
import DateTools from '../../utils/dateTools';

const importButtonInActions = Button({ id: 'dropdown-clickable-import-record' });
const importButtonInModal = Button('Import');
const OCLWorldCatIdentifierTextField = TextField('Enter OCLC WorldCat identifier');
const importTypeSelect = Select({ name :'externalIdentifierType' });

function verifyFileNameDate(actualDate) {
  const timeInterval = 60000;
  expect(actualDate).to.be.greaterThan(Date.now() - timeInterval);
  expect(actualDate).to.be.lessThan(Date.now() + timeInterval);
}


export default {
  open: () => { return Button('Actions').click(); },
  options: {
    saveUUIDs: Button('Save instances UUIDs'),
    saveCQLQuery: Button('Save instances CQL query'),
    exportMARC: Button('Export instances (MARC)'),
    showSelectedRecords: Button('Show selected records'),
  },
  optionsIsDisabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: true }));
    });
  },
  optionsIsEnabled: (array) => {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: false }));
    });
  },
  import(specialOCLCWorldCatidentifier = NewInventoryInstance.validOCLC.id) {
    cy.do(this.open());
    cy.do(importButtonInActions.click());

    // TODO: remove in the future, now related with differenes in our environments
    if (Cypress.env('is_kiwi_release')) {
      const oclcWorldCat = { text:'OCLC WorldCat',
        value : '6f171ee7-7a0a-4dd4-8959-bd67ec07cc88' };

      cy.do(importTypeSelect.choose(oclcWorldCat.text));
      cy.expect(importTypeSelect.has({ value: oclcWorldCat.value }));
    }

    cy.do(OCLWorldCatIdentifierTextField.fillIn(specialOCLCWorldCatidentifier));
    cy.do(importButtonInModal.click());

    NewInventoryInstance.checkExpectedOCLCPresence(specialOCLCWorldCatidentifier);
  },
  verifySaveUUIDsFileName(actualName) {
    // valid name example: SearchInstanceUUIDs2021-11-18T16_39_59+03_00.csv
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const stringWithDate = actualName.split('/');
    const actualDate = DateTools.parseDateFromFilename(stringWithDate, DateTools.fileNames.saveUUIDs);
    verifyFileNameDate(actualDate);
  },

  verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    expect(expectedUUIDs).to.deep.equal(formattedActualUUIDs);
  },

  verifySaveSQLQueryFileName(actualName) {
    // valid name example: SearchInstanceCQLQuery2021-12-09T14_45_54+03_00.cql
    const expectedFileNameMask = /SearchInstanceCQLQuery\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.cql/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const stringWithDate = actualName.split('/');
    const actualDate = DateTools.parseDateFromFilename(stringWithDate, DateTools.fileNames.saveSQLQuery);
    verifyFileNameDate(actualDate);
  },

  verifySaveSQLQuery(actualQuery, kw, lang) {
    cy.url().then((url) => {
      const params = new URLSearchParams(url.split('?')[1]);
      const effectiveLocationId = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/gm.exec(params.get('filters'))[0];
      const expectedText = `((keyword all "${kw ?? '*'}") and languages=="${lang ?? 'eng'}" and items.effectiveLocationId=="${effectiveLocationId}") sortby title`;
      expect(actualQuery).to.eq(expectedText);
    });
  },
};
