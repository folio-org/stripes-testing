import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };
    const testDataC410929 = {
      newResourceTitle: `C410929 instanceTitle${getRandomPostfix()}`,
      newResourceType: 'notated movement',
    };
    const testDataC410930 = {
      marcFile: {
        marc: 'oneMarcBib.mrc',
        marcFileName: `C410930 marcFileName${getRandomPostfix()}.mrc`,
      },
      newResourceTitle: `C410930 instanceTitle${getRandomPostfix()}`,
      newResourceType: 'notated movement',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testDataC410929.instance = instanceData;
      });
      DataImport.uploadFileViaApi(
        testDataC410930.marcFile.marc,
        testDataC410930.marcFile.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testDataC410930.instance = response[0].instance;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testDataC410929.instance.instanceId);
      InventoryInstance.deleteInstanceViaApi(testDataC410930.instance.id);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testDataC410929.duplicatedInstanceHrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testDataC410930.duplicatedInstanceHrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C410929 (NON-CONSORTIA) Duplicating instance on non-consortia tenant with Source FOLIO (folijet)',
      { tags: ['extendedPath', 'folijet', 'C410929'] },
      () => {
        InventoryInstances.searchByTitle(testDataC410929.instance.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillResourceTitle(testDataC410929.newResourceTitle);
        InventoryNewInstance.fillResourceType(testDataC410929.newResourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitInstanceRecordViewOpened(testDataC410929.newResourceTitle);
        InventoryInstance.checkInstanceDetails({
          instanceInformation: [{ key: 'Source', value: testData.source }],
        });
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testDataC410929.duplicatedInstanceHrid = initialInstanceHrId;
        });
      },
    );

    it(
      'C410930 (NON-CONSORTIA) Duplicating instance on non-consortia tenant with Source MARC (folijet)',
      { tags: ['extendedPath', 'folijet', 'C410930'] },
      () => {
        InventoryInstances.searchByTitle(testDataC410930.instance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillResourceTitle(testDataC410930.newResourceTitle);
        InventoryNewInstance.fillResourceType(testDataC410930.newResourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitInstanceRecordViewOpened(testDataC410930.newResourceTitle);
        InventoryInstance.checkInstanceDetails({
          instanceInformation: [{ key: 'Source', value: testData.source }],
        });
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testDataC410930.duplicatedInstanceHrid = initialInstanceHrId;
        });
      },
    );
  });
});
