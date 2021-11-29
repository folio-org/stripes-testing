import { Button } from '../../../../interactors';

export default class InventoryActions {
  static #actions = Button('Actions');
  static #saveUUIDsOption = Button('Save instances UUIDs');
  static #saveCQLQueryOption = Button('Save instances CQL query');
  static #exportMARCOption = Button('Export instances (MARC)');
  static #showSelectedRecordsOption = Button('Show selected records');


  static open() {
    return this.#actions.click();
  }

  static saveUUIDsOption() {
    return this.#saveUUIDsOption;
  }

  static saveCQLQueryOption() {
    return this.#saveCQLQueryOption;
  }

  static exportMARCOption() {
    return this.#exportMARCOption;
  }

  static showSelectedRecordsOption() {
    return this.#showSelectedRecordsOption;
  }

  static optionsIsDisabled(array) {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: true }));
    });
  }

  static optionsIsEnabled(array) {
    return array.forEach((element) => {
      cy.expect(element.is({ disabled: false }));
    });
  }

  static verifySaveUUIDsFileName(actualName) {
    const expectedFileNameMask = /SearchInstanceUUIDs\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.csv/gm;
    const isCorrectFilename = expectedFileNameMask.test(actualName);
    expect(isCorrectFilename).to.eq(true);
  }

  static verifySavedUUIDs(actualUUIDs, expectedUUIDs) {
    const formattedActualUUIDs = actualUUIDs.replaceAll('"', '').split('\n');
    for (let i = 0; i < expectedUUIDs.length; i++) {
      expect(expectedUUIDs[i]).to.eq(formattedActualUUIDs[i]);
    }
  }
}
