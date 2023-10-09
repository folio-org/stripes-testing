import { matching } from 'bigtest';
import { MultiColumnListRow, MultiColumnListCell, including } from '../../../../interactors';

export default {
  openFeeFine: (index = 0) => {
    return cy.do(MultiColumnListRow({ indexRow: `row-${index}` }).click());
  },

  checkResultsInTheRowByBarcode: (allContentToCheck, feeFineOwner) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(
      MultiColumnListRow({ text: matching(feeFineOwner), isContainer: false })
        .find(MultiColumnListCell({ content: including(contentToCheck) }))
        .exists(),
    ));
  },
};
