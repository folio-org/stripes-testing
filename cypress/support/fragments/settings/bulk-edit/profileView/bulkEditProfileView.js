import {
  Pane,
  Button,
  Headline,
  KeyValue,
  RepeatableFieldItem,
  Select,
  Selection,
  TextArea,
} from '../../../../../../interactors';

const profileViewPane = Pane({ id: 'pane-bulk-edit-profile-details' });
const targetRow = (rowIndex = 0) => RepeatableFieldItem({ index: rowIndex });

export default {
  waitLoading() {
    cy.expect(profileViewPane.exists());
  },

  verifyProfileDetails(name, description) {
    cy.expect([
      profileViewPane.has({ title: name }),
      profileViewPane.find(Headline(name)).exists(),
      profileViewPane.find(KeyValue('Description')).has({ value: description }),
    ]);
  },

  verifySelectedOption(option, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(Selection({ singleValue: option }))
        .visible(),
    );
  },

  verifySelectedAction(action, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(Select({ dataTestID: 'select-actions-0' }))
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectedLocation(location, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(Selection({ singleValue: location }))
        .visible(),
    );
  },

  verifyTextInDataTextArea(text, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .has({ textContent: text }),
    );
  },

  clickCloseFormButton() {
    cy.do(profileViewPane.find(Button({ icon: 'times' })).click());
  },
};
