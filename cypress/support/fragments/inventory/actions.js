import { Button } from '../../../../interactors';

export default class Actions {
  static actionsBtn = Button('Actions');
  static saveUUIDOption = '#dropdown-clickable-get-items-uiids';
  static saveCQLQueryOption = '#dropdown-clickable-get-cql-query';
  static exportMARCOption = '#dropdown-clickable-export-marc';
  static showSelectedRecordsOption = '#dropdown-clickable-show-selected-records';


  static open() {
    return this.actionsBtn.click();
  }

  static optionIsDisabled(selector, disabled) {
    return cy.get(selector)
      .invoke('prop', 'disabled')
      .should('eq', disabled);
  }

  static verifySaveUUIDsFileName(actualName) {
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    const isCorrectFilename = expectedFileNameMask.test(actualName);
    expect(isCorrectFilename).to.eq(true);
  }

  static verifySaveUUIDsInsideFile(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    for (let i = 0; i < expectedUUIDs.length; i++) {
      expect(expectedUUIDs[i]).to.eq(formattedActualUUIDs[i]);
    }
  }
}
