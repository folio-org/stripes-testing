import { QuickMarkEditorRow } from '../../../interactors';
import { read} from '@interactors/html';


export default class QuickMarcEditor {
static #quickMarkEditorRow = QuickMarkEditorRow();

static addNewLine() {
  cy.then(read(QuickMarkEditorRow(), 'rowsCount'))//.rowsCount())
    .then(rowsCount => {


      //cy.log(rowsCount);

      //cy.pause();
    });
}
}
