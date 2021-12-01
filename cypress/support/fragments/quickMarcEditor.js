import { read } from '@interactors/html';
import { QuickMarkEditor, QuickMarkEditorRow } from '../../../interactors';


export default class QuickMarcEditor {
  static addNewLine() {
    // example of checking of records presense
    // cy.expect(QuickMarkEditor().has({ rowsCount: 10 }));

    //--------
    // Может лучше экшон написать

    cy.do(QuickMarkEditor()
      .find(QuickMarkEditorRow({ index: 1 }))
      .click());

    cy.pause();

    //----------------
  // QuickMarkEditor().find()
  }
}
