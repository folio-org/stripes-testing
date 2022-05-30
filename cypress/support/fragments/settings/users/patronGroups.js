import uuid from 'uuid';
import { PaneHeader, Section, Button, TextField, including } from '../../../../../interactors';

const rootSection = Section({ id:'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id:'clickable-add-patrongroups' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-patrongroups-') }));
const patronGroupNameTextField = rootSection.find(TextField({ placeholder: 'group' }));

export default {
  waitLoading:() => cy.expect(rootSection.find(PaneHeader('Patron groups')).exists()),
  create:(patronGroup) => {
    cy.do(newButton.click());
    cy.do(patronGroupNameTextField.fillIn(patronGroup));
    cy.do(saveButton.click());
  },
  createViaApi: (patronGroup) => cy.okapiRequest({
    method: 'POST',
    path: 'groups',
    isDefaultSearchParamsRequired: false,
    body:{
      id:uuid(),
      group : patronGroup,
    }
  }).then(response => response.body.id),
  deleteViaApi:(patronGroupId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${patronGroupId}`,
      isDefaultSearchParamsRequired: false
    });
  }
};


