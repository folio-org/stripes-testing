import { read } from '@interactors/html';
import { QuickMarkEditor } from '../../../interactors';


export default class QuickMarcEditor {
  static addNewLine() {
  // cy.then(read(QuickMarkEditor(), 'rowsCount'))//.rowsCount())
  //   .then(rowsCount => {


    //     //cy.log(rowsCount);

    //     //cy.pause();
    //   });
    // cy.then(QuickMarkEditor().rows())
    //   .then((rowsCount) => {
    //     cy.log(rowsCount);
    //   });

    //cy.expect(QuickMarkEditor().has({ rowsCount: 10 }));
    //cy.do(QuickMarkEditor().rows()[10].click());
    cy.do(QuickMarkEditor().rows()[10].click());



  // QuickMarkEditor().find()
  }
}
