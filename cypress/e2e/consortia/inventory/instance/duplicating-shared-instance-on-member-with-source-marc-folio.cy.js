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
        marcFileName: `C410926 marcFileName${getRandomPostfix()}.mrc`,
      };
      const testData = {
        newResourceTitleC410925: `C410925 instanceTitle${getRandomPostfix()}`,
        newResourceTitleC410926: `C410926 instanceTitle${getRandomPostfix()}`,
        newResourceType: 'notated movement',
        source: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceC410925 = instanceData;
        });
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceC410926 = response[0].instance;
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
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410925.instanceId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceC410926.id);
        cy.setTenant(Affiliations.College);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410925Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceC410926Hrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C410925 (CONSORTIA) Duplicating shared instance on Member tenant with Source FOLIO (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410925'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410925.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410925);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410925);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410925Hrid = initialInstanceHrId;
          });
        },
      );

      it(
        'C410926 (CONSORTIA) Duplicating shared instance on Member tenant with Source MARC (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C410926'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceC410926.id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410926);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410926);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceC410926Hrid = initialInstanceHrId;
          });
        },
      );
    });
  });
});
