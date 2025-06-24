import { including } from '@interactors/html';
import {
  Button,
  MultiColumnListRow,
  Pane,
  TextField,
  Modal,
  NavListItem,
} from '../../../../../../interactors';

const urlRelationshipPane = Pane('URL relationship');
const newButton = Button('+ New');
const nameTextfield = TextField('Name 0');
const saveButton = Button('Save');
const deleteIcon = Button({ icon: 'trash' });
const deleteButton = Button('Delete');
const deleteUrlRelationshipModal = Modal('Delete URL relationship term');

function getListOfURLRelationship() {
  const cells = [];

  cy.wait(2000);
  return cy
    .get('div[class^="mclRowContainer--"]')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  getListOfURLRelationship,

  getViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'electronic-access-relationships',
        searchParams,
      })
      .then(({ body }) => {
        return body.electronicAccessRelationships;
      });
  },

  createViaApi(type) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'electronic-access-relationships',
        body: type,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `electronic-access-relationships/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  openTabFromInventorySettingsList() {
    cy.do(NavListItem('Inventory').click());
    cy.do(NavListItem('URL relationship').click());
  },

  waitloading() {
    cy.expect(urlRelationshipPane.exists());
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  fillInName(name) {
    cy.do(nameTextfield.fillIn(name));
  },

  clickSaveButton() {
    cy.do(saveButton.click());
  },

  createNewRelationship(name) {
    this.clickNewButton();
    this.fillInName(name);
    this.clickSaveButton();
  },

  verifyElectronicAccessNameOnTable(name) {
    cy.expect(MultiColumnListRow(including(name)).exists());
  },

  deleteUrlRelationship(name) {
    cy.do([
      MultiColumnListRow({ content: including(name), isContainer: false })
        .find(deleteIcon)
        .click(),
      deleteUrlRelationshipModal.find(deleteButton).click(),
    ]);
  },

  verifyListOfUrlRelationshipInHoldings(urlRelationshipsFromInstance) {
    getListOfURLRelationship().then((urlRelationships) => {
      cy.expect(urlRelationships.join('')).to.eq(...urlRelationshipsFromInstance);
    });
  },
};
