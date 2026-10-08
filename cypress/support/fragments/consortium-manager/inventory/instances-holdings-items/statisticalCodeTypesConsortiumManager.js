import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../../constants';
import { MultiColumnListHeader } from '../../../../../../interactors';
import ConsortiaControlledVocabularyPaneset from '../../consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import { INVENTORY_SETTINGS_TABS } from '../../../settings/inventory/settingsInventory';

export const STATISTICAL_CODE_ENTITY_TYPE = 'statistical code type';

const STATISTICAL_CODE_TYPES_API = '/statistical-code-types';

export default {
  waitLoading() {
    ConsortiaControlledVocabularyPaneset.waitLoading(
      INVENTORY_SETTINGS_TABS.STATISTICAL_CODE_TYPES,
    );
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Statistical code types');
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  createSharedViaApi(statisticalCodeType) {
    const id = uuid();
    const publication = {
      url: STATISTICAL_CODE_TYPES_API,
      settingId: id,
      payload: {
        id,
        name: statisticalCodeType.name,
      },
    };

    return cy
      .sendPublishCoordinatorShareSettingPublication(publication)
      .then(({ publicationResults }) => {
        return publicationResults[0].response;
      });
  },

  deleteSharedViaApi(statisticalCodeType, { failOnStatusCode = false } = {}) {
    const publication = {
      url: STATISTICAL_CODE_TYPES_API,
      settingId: statisticalCodeType.id,
      payload: statisticalCodeType,
    };

    return cy.sendPublishCoordinatorShareSettingPublication(publication, {
      method: REQUEST_METHOD.DELETE,
      failOnStatusCode,
    });
  },
};
