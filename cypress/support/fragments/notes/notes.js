import uuid from 'uuid';
import { REQUEST_METHOD } from '../../constants';
import { randomFourDigitNumber } from '../../utils/stringTools';

const defaultNote = ({ typeId, agreementId }, noteType = 'agreements') => {
  const linkType = {
    agreements: 'agreement',
    eholdings: 'provider',
    users: 'user',
    licenses: 'license',
    courses: 'course',
    requests: 'request',
  }[noteType];
  return {
    domain: noteType,
    typeId,
    title: `Default Note Title ${randomFourDigitNumber()}`,
    content: 'Default Note Details',
    links: [
      {
        type: linkType,
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
  deleteViaApi(noteId, ignoreErrors = false) {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `notes/${noteId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
  deleteNotesForEHoldingViaApi(eHoldingId) {
    this.getNotesForEHoldingViaApi(eHoldingId).then(({ notes }) => {
      notes.forEach(({ id: noteId }) => this.deleteViaApi(noteId));
    });
  },
  getNotesForCoursesViaApi(coursesId) {
    return cy
      .okapiRequest({
        path: `note-links/domain/courses/type/course/id/${coursesId}?limit=100000&order=desc&orderBy=updatedDate&status=assigned`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
  deleteNotesForCoursesViaApi(coursesId) {
    this.getNotesForCoursesViaApi(coursesId).then(({ notes }) => {
      notes.forEach(({ id: noteId }) => this.deleteViaApi(noteId));
    });
  },
};
