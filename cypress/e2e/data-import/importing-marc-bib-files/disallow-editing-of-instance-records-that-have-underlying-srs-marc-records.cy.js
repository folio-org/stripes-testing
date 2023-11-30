import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const filePath = 'marcFileForC2361.mrc';
    const marcFileName = `C2361 autotestFileName ${getRandomPostfix()}`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const title = "101 things I wish I'd known when I started";

    before('login', () => {
      // upload a mrc file as admin
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, marcFileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(jobProfileToRun);
      Logs.openFileDetails(marcFileName);
      FileDetails.verifyLogDetailsPageIsOpened();
      FileDetails.openJsonScreen(title);
      JsonScreenView.verifyJsonScreenIsOpened();
      JsonScreenView.getInstanceHrid().then((hrid) => {
        instanceHrid = hrid;
      });

      // create temp user with inventoryAll permissions
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);

        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C2361 Disallow editing of Instance records that have underlying SRS MARC records',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.checkReadOnlyFields();
        InstanceRecordEdit.checkCheckboxConditions([
          { label: 'Suppress from discovery', conditions: { disabled: false } },
          { label: 'Staff suppress', conditions: { disabled: false } },
          { label: 'Previously held', conditions: { disabled: false } },
        ]);
        InstanceRecordEdit.verifyCatalogDateInputIsDisabled(false);
        InstanceRecordEdit.verifyInstanceStatusTermConditionIsDisabled(false);
        InstanceRecordEdit.verifyStatisticalCodeIsEnabled();
        InstanceRecordEdit.verifyNatureOfContentIsEnabled();
        InstanceRecordEdit.verifyAddParentInstanceIsEnabled();
        InstanceRecordEdit.verifyAddChildInstanceIsEnabled();
      },
    );
  });
});
