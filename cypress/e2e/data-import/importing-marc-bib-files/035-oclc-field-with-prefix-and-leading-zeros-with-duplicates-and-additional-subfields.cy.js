import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    let instanceHrid;
    const filePath = 'marcBibFileForC466257.mrc';
    const marcFileName = `C466257 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const newValueIn035Field =
      '(OCoLC)64758 $z (OCoLC)976939443 $z (OCoLC)1001261435 $z (OCoLC)120194933';
    const resourceIdentifiers = [
      { type: 'OCLC', value: '(OCoLC)64758' },
      { type: 'Cancelled system control number', value: '(OCoLC)976939443' },
      { type: 'Cancelled system control number', value: '(OCoLC)1001261435' },
      { type: 'Cancelled system control number', value: '(OCoLC)120194933' },
    ];

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${instanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C466257 Import of file with 035 OCLC field with prefix and leading zeros with duplicates and additional subfields (folijet)',
      { tags: ['criticalPath', 'folijet', 'C466257'] },
      () => {
        // upload a marc file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
        });
        InstanceRecordView.verifyResourceIdentifier(
          resourceIdentifiers[0].type,
          resourceIdentifiers[0].value,
          6,
        );
        InstanceRecordView.verifyResourceIdentifier(
          resourceIdentifiers[1].type,
          resourceIdentifiers[1].value,
          2,
        );
        InstanceRecordView.verifyResourceIdentifier(
          resourceIdentifiers[2].type,
          resourceIdentifiers[2].value,
          0,
        );
        InstanceRecordView.verifyResourceIdentifier(
          resourceIdentifiers[3].type,
          resourceIdentifiers[3].value,
          1,
        );
        // verify table data in marc bibliographic source
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('035\t', `$a ${newValueIn035Field}`);
        InventoryViewSource.close();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.verifyTagField(7, '035', '\\', '\\', '$a ', newValueIn035Field);
      },
    );
  });
});
