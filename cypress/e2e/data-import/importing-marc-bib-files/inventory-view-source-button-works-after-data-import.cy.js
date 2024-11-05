import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId;
    let user;
    let instanceHrid;
    let instanceId;
    const fileName = `C2360 autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'oneMarcBib.mrc';
    const title = 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25';

    before('Create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(filePathToUpload, fileName, jobProfileToRun).then(
          (response) => {
            instanceHrid = response[0].instance.hrid;
            instanceId = response[0].instance.id;
          },
        );
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(preconditionUserId);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C2360 Confirm the Inventory "View source" button works after Data Import (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2360'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstanceIsOpened(title);
        InstanceRecordView.waitLoading();
        InstanceRecordView.viewSource();
        InstanceRecordView.verifySrsMarcRecord();
        InventoryViewSource.close();
        InstanceRecordView.verifyInstanceIsOpened(title);
      },
    );
  });
});
