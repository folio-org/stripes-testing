import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      marcFileName: `C411344 marcFileName${getRandomPostfix()}.mrc`,
    };
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.getConsortiaId()
        .then((consortiaId) => {
          testData.consortiaId = consortiaId;
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
          InventoryInstance.shareInstanceViaApi(
            testData.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
        });

      cy.resetTenant();
      cy.createTempUser([
        Permissions.uiInventoryViewCreateInstances.gui,
        Permissions.consortiaInventoryShareLocalInstance.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411344 (CONSORTIA) Check the "Share local instance" button on a source = MARC Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411344'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );
  });
});
