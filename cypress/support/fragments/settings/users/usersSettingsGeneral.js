import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  MultiColumnListHeader,
  Select,
  including,
} from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const ownerSelect = rootSection.find(Select({ id: 'select-owner' }));
const getRowByName = (name) => cy.then(() => rootSection.find(MultiColumnListCell(name)).row());
const getDescriptionColumnIdex = () => cy.then(() => rootSection.find(MultiColumnListHeader('Description')).index());

export default {
  checkEntityInTable: ({ name, description, ownerName }) => {
    if (ownerName) {
      cy.do(ownerSelect.choose(ownerName));
    }
    getRowByName(name).then((row) => {
      getDescriptionColumnIdex().then((descriptionColumnIdex) => {
        cy.expect(
          rootSection
            .find(MultiColumnListRow({ ariaRowIndex: row }))
            .find(MultiColumnListCell({ columnIndex: descriptionColumnIdex }))
            .has({ text: description }),
        );
      });
    });
  },

  checkEditDeleteNewButtonsNotDisplayed: () => {
    cy.expect([
      rootSection.find(Button({ id: including('clickable-add') })).absent(),
      rootSection.find(Button({ id: including('clickable-edit') })).absent(),
      rootSection.find(Button({ id: including('clickable-delete') })).absent(),
    ]);
  },
};
