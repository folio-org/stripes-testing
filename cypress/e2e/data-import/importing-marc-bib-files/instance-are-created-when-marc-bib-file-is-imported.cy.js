import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let instanceId;
    let userId;
    const fileName = `C2359 autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'oneMarcBib.mrc';

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathToUpload, fileName, jobProfileToRun).then((response) => {
        instanceHrid = response[0].instance.hrid;
        instanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C2359 Check that instances are created when a MARC bibliographic file is imported (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
      },
    );
  });
});
