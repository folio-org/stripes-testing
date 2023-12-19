import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathToUpload = 'marcBibFileForC6689.mrc';
    const fileName = `C6689 autotestFile.${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        // need to wait untill instance will be created
        cy.wait(8000);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C6689 Check the default mapping of control/product numbers from the MARC record to the Inventory Instance Identifier fields (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InstanceRecordView.waitLoading();
          InstanceRecordView.viewSource();
          InstanceRecordView.verifySrsMarcRecord();
          [
            { field: '010', fieldData: '$a    58020553' },
            { field: '022', fieldData: '$a 0022-0469' },
            { field: '035', fieldData: '$a (OCoLC)1604275' },
            { field: '035', fieldData: '$a (CStRLIN)NYCX1604275S' },
            { field: '035', fieldData: '$a (NIC)notisABP6388' },
            { field: '035', fieldData: '$a 366832' },
            { field: '040', fieldData: '$d CtY $d MBTI $d CtY $d MBTI $d NIC $d CStRLIN $d NIC' },
            { field: '050', fieldData: '$a BR140 $b .J6' },
          ].forEach((data) => {
            InventoryViewSource.verifyFieldInMARCBibSource(data.field, data.fieldData);
          });
        });
      },
    );
  });
});
