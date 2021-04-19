import { bigtestGlobals } from '@bigtest/globals';

function interact(interaction, runnerState) {
  bigtestGlobals.runnerState = runnerState;

  return cy.document({ log: false }).then((doc) => {
    bigtestGlobals.document = doc;

    return interaction;
  }).then(() => {
    Cypress.log({
      displayName: runnerState,
      message: interaction.description
    });
  });
}

Cypress.Commands.add('do', (interaction) => {
  if (Array.isArray(interaction)) {
    interaction.map(i => interact(i, 'step'));
  } else {
    interact(interaction, 'step');
  }
});

Cypress.Commands.add('expect', (interaction) => {
  if (Array.isArray(interaction)) {
    interaction.map(i => interact(i, 'assertion'));
  } else {
    interact(interaction, 'assertion');
  }
});
