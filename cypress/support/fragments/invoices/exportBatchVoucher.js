import { Button, Pane, Select } from '../../../../interactors';

export default {
  runManualExport1: () => {
    cy.do(Select({ id: 'select-8' }).choose('FOLIO'));
  },
  runManualExport2: () => {
    cy.do([
      Pane({ id: 'pane-batch-group-configuration' })
        .find(Select({ id: 'select-8' }).choose('FOLIO')),
      // Select({ name: 'format' }).choose('XML'),
      // Button('Save').click(),
    ]);
  },
  runManualExport3: () => {
    cy.do([
      Button('Run manual export').click(),
      Button({ id: 'clickable-run-manual-export-confirmation-confirm' }).click(),
    ]);
  },
};
