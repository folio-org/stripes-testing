import { Button } from '../../../../interactors';


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
  verifySaveUUIDsFileName(actualName) {
    // Check naming mask
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    // Check date value
    const dateString = actualName.split('/');
    const actualDate = Date.parse(dateString[dateString.length - 1].slice(19, 38).replaceAll('_', ':'));
    expect(actualDate).to.be.greaterThan(Date.now() - 100000);
    expect(actualDate).to.be.lessThan(Date.now() + 100000);
  },
  verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    for (let i = 0; i < expectedUUIDs.length; i++) {
      expect(expectedUUIDs[i]).to.eq(formattedActualUUIDs[i]);
    }
  },
  saveUUIDs() {
    return cy.do([
      this.open(),
      this.options.saveUUIDs.click()
    ]);
  }
};
