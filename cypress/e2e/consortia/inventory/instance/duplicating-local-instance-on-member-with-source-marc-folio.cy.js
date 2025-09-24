import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        marcFileName: `C410924 marcFileName${getRandomPostfix()}.mrc`,
      };
      const testData = {
        newResourceTitleC410923: `C410923 instanceTitle${getRandomPostfix()}`,
        newResourceTitleC410924: `C410924 instanceTitle${getRandomPostfix()}`,
        newResourceType: 'notated movement',
        source: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceC410923 = instanceData;
        });
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceC410924 = response[0].instance;
        });

        cy.resetTenant();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
        });
      });

      beforeEach('Login', () => {
        cy.resetTenant();
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410923.instanceId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410924.id);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410923Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410924Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C410923 (CONSORTIA) Duplicating local instance on Member tenant with Source FOLIO (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410923'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410923.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410923);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410923);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410923Hrid = initialInstanceHrId;
          });
        },
      );

      it(
        'C410924 (CONSORTIA) Duplicating local instance on Member tenant with Source MARC (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410924'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410924.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410924);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410924);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410924Hrid = initialInstanceHrId;
          });
        },
      );
    });
  });
});
