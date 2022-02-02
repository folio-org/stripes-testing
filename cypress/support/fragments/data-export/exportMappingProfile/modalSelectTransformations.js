import { Checkbox, Button, Modal, TextField } from '../../../../../interactors';

export default {
  searchItemTransformationsByName: (name) => {
    cy.get('div[class^=modal-] input[name=searchValue]').type(`${name}{enter}`);
  },

  selectHoldingsTransformations:() => {
    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.do(Modal('Select transformations').find(TextField({name: ''}).then => names[]))
  
    
    // cy.get('section[class^=pane-] input[placeholder="900"]').type('901');
    // cy.xpath('//input[contains(@name,"subfield")]').type('$a');
    cy.do(Modal('Select transformations').find(Button('Save & close')).click());
  },

  selectItemTransformations:() => {
    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.get('section[class^=pane-] input[placeholder="900"]').type('902');
    cy.get('section[class^=pane-] input[placeholder="$a"]').type('$a');
    cy.do(Modal('Select transformations').find(Button('Save & close')).click());
  },
};
