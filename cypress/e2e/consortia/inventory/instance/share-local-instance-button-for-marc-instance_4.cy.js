import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      marcFileName: `C411342 marcFileName${getRandomPostfix()}.mrc`,
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
      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateInstances.gui,
        ]);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411342 (CONSORTIA) Check the "Share local instance" button without permission on a local Source = MARC Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411342'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );
  });
});
