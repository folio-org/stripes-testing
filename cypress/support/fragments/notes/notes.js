import uuid from 'uuid';
import { REQUEST_METHOD } from '../../constants';
import { randomFourDigitNumber } from '../../utils/stringTools';

const defaultNote = ({ typeId, agreementId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: `Default Note Title ${randomFourDigitNumber()}`,
    content: 'Default Note Details',
    links: [
      {
        type: 'agreement',
        id: agreementId,
      },
    ],
    id: uuid(),
  };
};

const defaultUnassignedNote = ({ typeId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: `Default  Unassigned Note Title ${randomFourDigitNumber()}`,
    content: 'Default Note Details',
    id: uuid(),
  };
};

const defaultTwoAssignedNote = ({ typeId, firstAgreementId, secondAgreementId }) => {
  return {
    domain: 'agreements',
    typeId,
    title: `Default  TwoAassigned Note Title ${randomFourDigitNumber()}`,
    content: 'Default TwoAassigned Note Details',
    links: [
      {
        type: 'agreement',
        id: firstAgreementId,
      },
      {
        type: 'agreement',
        id: secondAgreementId,
      },
    ],
    id: uuid(),
  };
};

export default {
  defaultNote,
  defaultUnassignedNote,
  defaultTwoAssignedNote,

  getNotesForEHoldingViaApi(eHoldingId) {
    return cy
      .okapiRequest({
        path: `note-links/domain/eholdings/type/package/id/${eHoldingId}?status=assigned`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
  createViaApi(note) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'notes',
        body: note,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
  deleteViaApi(noteId) {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `notes/${noteId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteNotesForEHoldingViaApi(eHoldingId) {
    this.getNotesForEHoldingViaApi(eHoldingId).then(({ notes }) => {
      notes.forEach(({ id: noteId }) => this.deleteViaApi(noteId));
    });
  },
};
