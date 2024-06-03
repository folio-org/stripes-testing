import { PaneHeader } from '../../../../interactors';

const paneHeader = PaneHeader('Local KB admin');

export default {
  waitLoading: () => {
    cy.expect(paneHeader.exists());
  },
};
