import {Button} from "../../../../interactors";

export default class Actions {
  static #actions = 'Actions';
  static saveUUIDOption = '#dropdown-clickable-get-items-uiids';
  static saveCQLQueryOption = '#dropdown-clickable-get-cql-query';
  static exportMARCOption = '#dropdown-clickable-export-marc';
  static showSelectedRecordsOption = '#dropdown-clickable-show-selected-records';


  static openActions() {
    return Button(this.#actions).click();
  }

}
