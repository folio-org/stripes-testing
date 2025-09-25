import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
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
        marcFileName: `C410928 marcFileName${getRandomPostfix()}.mrc`,
      };
      const testData = {
        newResourceTitleC410927: `C410927 instanceTitle${getRandomPostfix()}`,
        newResourceTitleC410928: `C410928 instanceTitle${getRandomPostfix()}`,
        newResourceType: 'notated movement',
        source: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceC410927 = instanceData;
        });
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceC410928 = response[0].instance;
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
      });

      beforeEach('Login', () => {
        cy.resetTenant();
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410927.instanceId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410928.id);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410927Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410928Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C410927 (CONSORTIA) Duplicating shared instance on Central tenant with Source FOLIO (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410927'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410927.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410927);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410927);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410927Hrid = initialInstanceHrId;
          });
        },
      );

      it(
        'C410928 (CONSORTIA) Duplicating shared instance on Central tenant with Source MARC (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410928'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410928.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410928);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410928);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410928Hrid = initialInstanceHrId;
          });
        },
      );
    });
  });
});
