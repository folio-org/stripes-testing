import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import { PaneHeader, Section, Button, TextField, including } from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id: 'clickable-add-patrongroups' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-patrongroups-') }));
const patronGroupNameTextField = rootSection.find(TextField({ placeholder: 'group' }));

const defaultPatronGroup = {
  group: `Patron_group_${getRandomPostfix()}`,
  desc: 'Patron_group_description',
  expirationOffsetInDays: '10',
};

export default {
  waitLoading: () => cy.expect(rootSection.find(PaneHeader('Patron groups')).exists()),
  create: (patronGroup) => {
    cy.do(newButton.click());
    cy.do(patronGroupNameTextField.fillIn(patronGroup));
    cy.do(saveButton.click());
  },
  createViaApi: (patronGroup = defaultPatronGroup.group) => cy
    .okapiRequest({
      method: 'POST',
      path: 'groups',
      isDefaultSearchParamsRequired: false,
      body: {
        id: uuid(),
        group: patronGroup,
      },
    })
    .then((response) => response.body.id),
  deleteViaApi: (patronGroupId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${patronGroupId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
