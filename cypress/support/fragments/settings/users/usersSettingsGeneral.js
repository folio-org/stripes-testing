import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  MultiColumnListHeader,
  including,
} from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });

const getRowByReason = (reason) => cy.then(() => rootSection.find(MultiColumnListCell(reason)).row());
const getDescriptionColumnIdex = () => cy.then(() => rootSection.find(MultiColumnListHeader('Description')).index());

export default {
  checkEntityInTable: ({ reason, description }) => {
    getRowByReason(reason).then((row) => {
      getDescriptionColumnIdex().then((descriptionColumnIdex) => {
        cy.expect(
          rootSection
            .find(MultiColumnListRow({ ariaRowIndex: row }))
            .find(MultiColumnListCell({ columnIndex: descriptionColumnIdex }))
            .has({ text: description })
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
