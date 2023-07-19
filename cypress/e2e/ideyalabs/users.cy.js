
import topMenu from '../../support/fragments/topMenu';
import users from '../../support/fragments/users/users';

const userOne = {
  patronGroup:'A1A1',
  barcode:'237452322',
  username:'shdusdh330',
  personal:{
    lastName:'somai',
    firstName:'king1',
    email:'dan@gmail.com'
  }
};
const userTwo = {
  patronGroup:'A1A1',
  barcode:'23745',
  username:'shdusdhA330',
  personal:{
    lastName:'somaid',
    firstName:'king3',
    email:'dan123@gmail.com'
  }
};

describe('creat a users', () => {
  it('C421-Create: new user; required: contact info, email, phone, external system ID, address', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.usersPath);
    users.createViaUi(userOne);
    cy.visit(topMenu.usersPath);
    users.createViaUi(userTwo);// barcode
  });
  it('C11096-Add Preferred first name and confirm its display in the User record View and Edit screens', () => {
    cy.visit(topMenu.usersPath);
    users.createData({ patronGroup: 'A1A1', barcode: '253123712819', username: 'aysgt26', personal: { lastName: 'Array', email: 'dan@gmail.com', middleName:'chary', firstName: 'king1', Preferredfirstname:'Dan basco1' } });
    users.verifyPreferredfirstnameOnUserDetailsPane('Dan basco1');
    users.verifyLastNameOnUserDetailsPane('Array');
    users.verifyMiddleNameOnUserDetailsPane('chary');
    users.editButton();
    users.clearTextfield();
    users.SaveBtn();
    users.verifyLastNameOnUserDetailsPane('Array');
    users.verifyMiddleNameOnUserDetailsPane('chary');
    users.verifyFirstNameOnUserDetailsPane('king1');
    users.editButton();
    users.clearTextfieldfirstName();
    users.SaveBtn();
  });
});





