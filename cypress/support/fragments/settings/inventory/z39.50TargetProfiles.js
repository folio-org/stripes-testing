import { KeyValue } from '../../../../../interactors';
import {
    Button,
    TextField,
    Pane,
    Link,
    including
  } from '../../../../../interactors';

export default {
    openOclcWorldCat:() => {
        cy.do(Pane('Z39.50 target profiles')
        .find(Link({ href: including('/settings/inventory/targetProfiles/f26df83c-aa25-40b6-876e-96852c3d4fd4') }))
        .click());
    },

    editOclcWorldCat:(auth) => {
        cy.do(Pane({id: 'paneHeader110'}).find(Button('Edit')).click());
        cy.do(Pane({id: '120-content'}).find(TextField({id: 'input-targetprofile-authentication'})).fillIn(auth));
        cy.do(Pane({id: '120-content'}).find(Button('Save & close')).click());
    },

    checkIsOclcWorldCatIsChanged:(auth) => {
        cy.expect(Pane('✓ OCLC WorldCat').find(KeyValue({ value: auth })));
    }
};