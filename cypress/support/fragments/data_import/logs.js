import {
  Accordion,
  Button,
  MultiColumnListCell,
  Selection,
  SelectionList,
} from '../../../../interactors';

const createdItemsColumns = [
  MultiColumnListCell({ row: 0, columnIndex: 2 }),
  MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }),
  MultiColumnListCell({ row: 0, columnIndex: 5 })
];

const checkIsSrsUpdated = () => {
  cy.do(createdItemsColumns[0].perform(element => {
    expect(element).to.have.text('Updated');
  }));
};

const checkIsInstanceCreated = () => {
  // TODO: redesign from perform to regular cy.expect
  cy.do(createdItemsColumns[1].perform(element => {
    expect(element).to.have.text('Created');
  }));
};

const checkIsInstanceUpdated = () => {
  cy.do(createdItemsColumns[1].perform(element => {
    expect(element).to.have.text('Updated');
  }));
};

const checkIsHoldingsCreated = () => {
  cy.do(createdItemsColumns[2].perform(element => {
    expect(element).to.have.text('Created');
  }));
};

const checkIsItemCreated = () => {
  cy.do(createdItemsColumns[3].perform(element => {
    expect(element).to.have.text('Created');
  }));
};

const checkIsInvoiceCreated = () => {
  cy.expect(MultiColumnListCell({ row: 0, column: 'Created' }).exists());
};

export default {
  checkImportFile(jobProfileName) {
    cy.do(Button('View all').click());
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Selection({ value: 'Choose job profile' }).open(),
      SelectionList().select(jobProfileName)
    ]);
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: 'Completed' }).exists());
  },

  openJobProfile:(fileName) => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button(fileName)).click());
  },

  checkCreatedItems:() => {
    createdItemsColumns.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },

  checkUpdatedItems:() => {
    createdItemsColumns.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Updated');
      }));
    });
  },

  checkQuantityRecordsInFile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: '18' }).exists());
  },

  checkUpdatedCreatedItems:() => {
    checkIsSrsUpdated();
    checkIsInstanceCreated();
    checkIsHoldingsCreated();
    checkIsItemCreated();
  },

  checkUpdatedSrsAndInstance:() => {
    checkIsSrsUpdated();
    checkIsInstanceUpdated();
  },

  checkIsInstanceCreated,
  checkIsInstanceUpdated,
  checkIsInvoiceCreated,
};
