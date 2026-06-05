import uuid from 'uuid';
import { INVENTORY_SETTINGS_SECTION_LABELS, REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiumManagerApp, {
  messages,
  SHARED_SETTING_LIBRARIES,
} from '../../consortiumManagerApp';
import deleteCancelReason from '../../modal/delete-cancel-reason';

const id = uuid();

export const typeActions = {
  edit: 'edit',
  trash: 'trash',
};

const ITEM_NOTE_TYPE = 'item note type';

export default {
  createViaApi(type) {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/item-note-types',
          settingId: id,
          payload: {
            id,
            name: type.payload.name,
          },
        },
      }).then(() => {
        type.url = '/item-note-types';
        type.settingId = id;
        return type;
      });
    });
  },

  deleteViaApi(type, { failOnStatusCode = false } = {}) {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${type.settingId}`,
        body: type,
        failOnStatusCode,
      });
    });
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem(INVENTORY_SETTINGS_SECTION_LABELS.ITEM_NOTE_TYPES);
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  waitLoadingDeleteModal(typeName) {
    deleteCancelReason.waitLoadingDeleteModal(ITEM_NOTE_TYPE, typeName);
  },

  assertSettingIsDisplayed() {
    ConsortiumManagerApp.verifySelectedSettingIsDisplayed(
      INVENTORY_SETTINGS_SECTION_LABELS.ITEM_NOTE_TYPES,
    );
  },

  assertCreatedCalloutMessage(typeName, members = SHARED_SETTING_LIBRARIES) {
    ConsortiumManagerApp.checkMessage(messages.created(typeName, members));
  },

  assertUpdatedCalloutMessage(typeName, members = SHARED_SETTING_LIBRARIES) {
    ConsortiumManagerApp.checkMessage(messages.updated(typeName, members));
  },

  assertDeletedCalloutMessage(typeName) {
    ConsortiumManagerApp.checkMessage(messages.deleted(ITEM_NOTE_TYPE, typeName));
  },
};
