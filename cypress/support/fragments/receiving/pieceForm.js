import { Accordion, Link, Pane } from '../../../../interactors';
import {
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_MODES,
} from '../../constants';

const pieceFormPane = Pane({ id: 'pane-title-form' });
const connectedItemLink = Link('Connected');
const pieceDetailsAccordion = Accordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.PIECE_DETAILS);

export default {
  waitLoading(mode = RECEIVING_PIECE_FORM_MODES.CREATE) {
    cy.expect(pieceFormPane.exists());
    cy.expect(
      pieceFormPane.has({
        title: mode === RECEIVING_PIECE_FORM_MODES.CREATE ? 'Add piece' : 'Edit piece',
      }),
    );
    cy.get('[class^="spinner"]').should('not.exist');
  },

  clickConnectedItemLink() {
    cy.do(pieceDetailsAccordion.find(connectedItemLink).click());
  },
};
