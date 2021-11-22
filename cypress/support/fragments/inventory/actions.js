import { Button } from '../../../../interactors';

export default class Actions {
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
}
